export class FileUtils {
  static async loadFileContent(path: string): Promise<string> {
    const response = await fetch(path);
    const text = response.text();
    return text;
  }
}
