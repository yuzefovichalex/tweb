export class FileUtils {
    
    static async loadFileContent(path: string): Promise<string> {
        const response = await fetch(path);
        return await response.text();
    }

}