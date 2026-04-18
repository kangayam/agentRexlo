export interface UploadResult {
  url: string
  path: string
}

export async function uploadFile(
  _bucket: string,
  _path: string,
  _file: File | Buffer
): Promise<UploadResult> {
  // TODO: implement in upload sprint
  throw new Error('uploadFile: not yet implemented')
}

export async function getFileUrl(_bucket: string, _path: string): Promise<string> {
  // TODO: implement in upload sprint
  throw new Error('getFileUrl: not yet implemented')
}
