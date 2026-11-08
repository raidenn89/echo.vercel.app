import { getImageStatus, type GenerateImageOutputType } from 'zitejs/api';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves an asynchronous Pro job while leaving Free image URLs unchanged. */
export async function resolveGeneratedImage(
  result: GenerateImageOutputType,
  isCancelled: () => boolean = () => false,
): Promise<string> {
  if (!result.allowed) return '';
  if (!result.jobId) return result.dataUrl;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (isCancelled()) return '';
    await wait(2500);
    if (isCancelled()) return '';
    const status = await getImageStatus({ jobId: result.jobId });
    if (status.status === 'complete' && status.dataUrl) return status.dataUrl;
    if (status.status === 'failed') throw new Error(status.message || 'AI Horde could not finish this image.');
  }
  throw new Error('This image is still waiting in the AI Horde queue. Try again in a little while.');
}
