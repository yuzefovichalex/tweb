import { logger, LogLevels } from "../lib/polyfill";

type LazyLoadElement = {
  div: HTMLDivElement, 
  load: () => Promise<any>, 
  wasSeen?: boolean
};

export default class LazyLoadQueue {
  private lazyLoadMedia: Array<LazyLoadElement> = [];
  private loadingMedia = 0;
  private tempID = 0;

  private lockPromise: Promise<void> = null;
  private unlockResolve: () => void = null;

  private log = logger('LL', LogLevels.error);

  // Observer will call entry only 1 time per element
  private observer: IntersectionObserver;

  constructor(private parallelLimit = 5, noObserver = false) {
    if(noObserver) return;

    this.observer = new IntersectionObserver(entries => {
      if(this.lockPromise) return;

      for(const entry of entries) {
        if(entry.isIntersecting) {
          const target = entry.target as HTMLElement;

          this.log('isIntersecting', target);

          // need for set element first if scrolled
          const item = this.lazyLoadMedia.findAndSplice(i => i.div == target);
          if(item) {
            item.wasSeen = true;
            this.lazyLoadMedia.unshift(item);
            this.processQueue(item);
          }
        }
      }
    });
  }

  public clear() {
    this.tempID--;
    this.lazyLoadMedia.length = 0;
    this.loadingMedia = 0;

    if(this.observer) {
      this.observer.disconnect();
    }
  }

  public length() {
    return this.lazyLoadMedia.length + this.loadingMedia;
  }

  public lock() {
    if(this.lockPromise) return;
    this.lockPromise = new Promise((resolve, reject) => {
      this.unlockResolve = resolve;
    });
  }

  public unlock() {
    if(!this.unlockResolve) return;
    this.lockPromise = null;
    this.unlockResolve();
    this.unlockResolve = null;
  }

  public async processQueue(item?: LazyLoadElement) {
    if(this.parallelLimit > 0 && this.loadingMedia >= this.parallelLimit) return;

    if(item) {
      this.lazyLoadMedia.findAndSplice(i => i == item);
    } else {
      item = this.lazyLoadMedia.findAndSplice(i => i.wasSeen);
    }

    if(item) {
      this.loadingMedia++;

      let tempID = this.tempID;

      this.log('will load media', this.lockPromise, item);

      try {
        if(this.lockPromise/*  && false */) {
          let perf = performance.now();
          await this.lockPromise;

          this.log('waited lock:', performance.now() - perf);
        }
        
        //await new Promise((resolve, reject) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
        await item.load();
      } catch(err) {
        this.log.error('loadMediaQueue error:', err, item);
      }

      if(tempID == this.tempID) {
        this.loadingMedia--;
      }

      this.log('loaded media', item);

      if(this.lazyLoadMedia.length) {
        this.processQueue();
      }
    }
  }

  public addElement(el: LazyLoadElement) {
    if(el.wasSeen) {
      this.processQueue(el);
    } else {
      el.wasSeen = false;

      if(this.observer) {
        this.observer.observe(el.div);
      }
    }
  }
  
  public push(el: LazyLoadElement) {
    this.lazyLoadMedia.push(el);
    this.addElement(el);
  }

  public unshift(el: LazyLoadElement) {
    this.lazyLoadMedia.unshift(el);
    this.addElement(el);
  }
}
