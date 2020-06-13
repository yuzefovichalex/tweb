import apiFileManager from '../mtproto/apiFileManager';
import FileManager from '../filemanager';
import {RichTextProcessor} from '../richtextprocessor';
import { CancellablePromise, deferredPromise } from '../polyfill';
import { isObject } from '../utils';
import opusDecodeController from '../opusDecodeController';
import { MTDocument } from '../../types';

class AppDocsManager {
  private docs: {[docID: string]: MTDocument} = {};
  private thumbs: {[docIDAndSize: string]: Promise<string>} = {};
  private downloadPromises: {[docID: string]: CancellablePromise<Blob>} = {};

  public saveDoc(apiDoc: MTDocument, context?: any) {
    //console.log('saveDoc', apiDoc, this.docs[apiDoc.id]);
    if(this.docs[apiDoc.id]) {
      let d = this.docs[apiDoc.id];

      if(apiDoc.thumbs) {
        if(!d.thumbs) d.thumbs = apiDoc.thumbs;
        else if(apiDoc.thumbs[0].bytes && !d.thumbs[0].bytes) {
          d.thumbs.unshift(apiDoc.thumbs[0]);
        }
      }

      return context ? Object.assign(d, context) : d;
    }
    
    if(context) {
      Object.assign(apiDoc, context);
    }

    this.docs[apiDoc.id] = apiDoc;
    
    if(apiDoc.thumb && apiDoc.thumb._ == 'photoCachedSize') {
      console.warn('this will happen!!!');
      apiFileManager.saveSmallFile(apiDoc.thumb.location, apiDoc.thumb.bytes);
      
      // Memory
      apiDoc.thumb.size = apiDoc.thumb.bytes.length;
      delete apiDoc.thumb.bytes;
      apiDoc.thumb._ = 'photoSize';
    }
    
    if(apiDoc.thumb && apiDoc.thumb._ == 'photoSizeEmpty') {
      delete apiDoc.thumb;
    }
    
    apiDoc.attributes.forEach((attribute: any) => {
      switch(attribute._) {
        case 'documentAttributeFilename':
          apiDoc.file_name = RichTextProcessor.wrapPlainText(attribute.file_name);
          break;

        case 'documentAttributeAudio':
          apiDoc.duration = attribute.duration;
          apiDoc.audioTitle = attribute.title;
          apiDoc.audioPerformer = attribute.performer;
          apiDoc.type = attribute.pFlags.voice ? 'voice' : 'audio';
          break;

        case 'documentAttributeVideo':
          apiDoc.duration = attribute.duration;
          apiDoc.w = attribute.w;
          apiDoc.h = attribute.h;
          if(apiDoc.thumbs && attribute.pFlags.round_message) {
            apiDoc.type = 'round';
          } else /* if(apiDoc.thumbs) */ {
            apiDoc.type = 'video';
          }
          break;

        case 'documentAttributeSticker':
          if(attribute.alt !== undefined) {
            apiDoc.stickerEmojiRaw = attribute.alt;
            apiDoc.stickerEmoji = RichTextProcessor.wrapRichText(apiDoc.stickerEmojiRaw, {noLinks: true, noLinebreaks: true});
          }

          if(attribute.stickerset) {
            if(attribute.stickerset._ == 'inputStickerSetEmpty') {
              delete attribute.stickerset;
            } else if(attribute.stickerset._ == 'inputStickerSetID') {
              apiDoc.stickerSetInput = attribute.stickerset;
            }
          }

          if(/* apiDoc.thumbs &&  */apiDoc.mime_type == 'image/webp') {
            apiDoc.type = 'sticker';
            apiDoc.sticker = 1;
          }
          break;

        case 'documentAttributeImageSize':
          apiDoc.w = attribute.w;
          apiDoc.h = attribute.h;
          break;

        case 'documentAttributeAnimated':
          if((apiDoc.mime_type == 'image/gif' || apiDoc.mime_type == 'video/mp4') && apiDoc.thumbs) {
            apiDoc.type = 'gif';
          }

          apiDoc.animated = true;
          break;
      }
    });
    
    if(!apiDoc.mime_type) {
      switch(apiDoc.type) {
        case 'gif':
          apiDoc.mime_type = 'video/mp4';
          break;
        case 'video':
        case 'round':
          apiDoc.mime_type = 'video/mp4';
          break;
        case 'sticker':
          apiDoc.mime_type = 'image/webp';
          break;
        case 'audio':
          apiDoc.mime_type = 'audio/mpeg';
          break;
        case 'voice':
          apiDoc.mime_type = 'audio/ogg';
          break;
        default:
          apiDoc.mime_type = 'application/octet-stream';
          break;
      }
    }
    
    if(!apiDoc.file_name) {
      apiDoc.file_name = '';
    }

    if(apiDoc.mime_type == 'application/x-tgsticker' && apiDoc.file_name == "AnimatedSticker.tgs") {
      apiDoc.type = 'sticker';
      apiDoc.animated = true;
      apiDoc.sticker = 2;
    }
    
    if(apiDoc._ == 'documentEmpty') {
      apiDoc.size = 0;
    }

    return apiDoc;
  }
  
  public getDoc(docID: any): MTDocument {
    return isObject(docID) ? docID : this.docs[docID];
  }

  public getMediaInputByID(docID: any) {
    let doc = this.getDoc(docID);
    return {
      _: 'inputMediaDocument',
      flags: 0,
      id: {
        _: 'inputDocument',
        id: doc.id,
        access_hash: doc.access_hash,
        file_reference: doc.file_reference
      },
      ttl_seconds: 0
    };
  }

  public getInputByID(docID: any, thumbSize?: string) {
    let doc = this.getDoc(docID);

    return {
      _: 'inputDocumentFileLocation',
      id: doc.id,
      access_hash: doc.access_hash,
      file_reference: doc.file_reference,
      thumb_size: thumbSize
    };
  }
  
  public getFileName(doc: MTDocument) {
    if(doc.file_name) {
      return doc.file_name;
    }

    var fileExt = '.' + doc.mime_type.split('/')[1];
    if(fileExt == '.octet-stream') {
      fileExt = '';
    }

    return 't_' + (doc.type || 'file') + doc.id + fileExt;
  }
  
  public downloadDoc(docID: any, toFileEntry?: any): CancellablePromise<Blob> {
    const doc = this.getDoc(docID);

    if(doc._ == 'documentEmpty') {
      return Promise.reject();
    }
    
    const inputFileLocation = this.getInputByID(doc);
    if(doc.downloaded && !toFileEntry) {
      if(doc.url) return Promise.resolve(null);

      const cachedBlob = apiFileManager.getCachedFile(inputFileLocation);
      if(cachedBlob) {
        return Promise.resolve(cachedBlob);
      }
    }

    if(this.downloadPromises[doc.id]) {
      return this.downloadPromises[doc.id];
    }
    
    //historyDoc.progress = {enabled: !historyDoc.downloaded, percent: 1, total: doc.size};

    const deferred = deferredPromise<Blob>();
    deferred.cancel = () => {
      downloadPromise.cancel();
    };

    // нет смысла делать объект с выполняющимися промисами, нижняя строка и так вернёт загружающийся
    const downloadPromise = apiFileManager.downloadFile(doc.dc_id, inputFileLocation, doc.size, {
      mimeType: doc.mime_type || 'application/octet-stream',
      toFileEntry: toFileEntry,
      stickerType: doc.sticker
    });

    downloadPromise.notify = (...args) => {
      deferred.notify && deferred.notify(...args);
    };

    deferred.notify = downloadPromise.notify;
    
    downloadPromise.then((blob) => {
      if(blob) {
        doc.downloaded = true;

        if(doc.type == 'voice' && !opusDecodeController.isPlaySupported()/*  && false */) {
          let reader = new FileReader();

          reader.onloadend = (e) => {
            let uint8 = new Uint8Array(e.target.result as ArrayBuffer);
            //console.log('sending uint8 to decoder:', uint8);
            opusDecodeController.decode(uint8).then(result => {
              doc.url = result.url;
              deferred.resolve(blob);
            }, deferred.reject);
          };

          reader.readAsArrayBuffer(blob);

          return;
        } else if(doc.type && doc.sticker != 2) {
          doc.url = URL.createObjectURL(blob);
        }
      }
      
      deferred.resolve(blob);
    }, (e) => {
      console.log('document download failed', e);
      deferred.reject(e);
      //historyDoc.progress.enabled = false;
    });

    /* downloadPromise.notify = (progress) => {
      console.log('dl progress', progress);
      historyDoc.progress.enabled = true;
      historyDoc.progress.done = progress.done;
      historyDoc.progress.percent = Math.max(1, Math.floor(100 * progress.done / progress.total));
      $rootScope.$broadcast('history_update');
    }; */
    
    //historyDoc.progress.cancel = downloadPromise.cancel;

    //console.log('return downloadPromise:', downloadPromise);
    
    return this.downloadPromises[doc.id] = deferred;
  }

  public downloadDocThumb(docID: any, thumbSize: string) {
    let doc = this.getDoc(docID);

    let key = doc.id + '-' + thumbSize;
    if(this.thumbs[key]) {
      return this.thumbs[key];
    }

    let input = this.getInputByID(doc, thumbSize);

    if(doc._ == 'documentEmpty') {
      return Promise.reject();
    }

    let mimeType = doc.sticker ? 'image/webp' : doc.mime_type;
    let promise = apiFileManager.downloadSmallFile(input, {
      dcID: doc.dc_id, 
      stickerType: doc.sticker ? 1 : undefined,
      mimeType: mimeType
    });

    return this.thumbs[key] = promise.then((blob) => {
      return URL.createObjectURL(blob);
    });
  }

  public hasDownloadedThumb(docID: string, thumbSize: string) {
    return !!this.thumbs[docID + '-' + thumbSize];
  }
  
  public async saveDocFile(docID: string) {
    var doc = this.docs[docID];
    var fileName = this.getFileName(doc);
    var ext = (fileName.split('.', 2) || [])[1] || '';

    try {
      let writer = FileManager.chooseSaveFile(fileName, ext, doc.mime_type, doc.size);
      await writer.ready;

      let promise = this.downloadDoc(docID, writer);
      promise.then(() => {
        writer.close();
        console.log('saved doc', doc);
      });

      //console.log('got promise from downloadDoc', promise);
  
      return {promise};
    } catch(err) {
      let promise = this.downloadDoc(docID);
      promise.then((blob) => {
        FileManager.download(blob, doc.mime_type, fileName)
      });

      return {promise};
    }
  }
}

export default new AppDocsManager();
