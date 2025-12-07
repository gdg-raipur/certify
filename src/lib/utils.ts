import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates an email address using a basic regex pattern.
 * @param email - The email address to validate
 * @returns true if the email matches the basic pattern, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Executes an array of async tasks with a concurrency limit.
 * @param concurrency - Maximum number of tasks to run concurrently
 * @param tasks - Array of async task functions to execute
 * @returns Promise resolving to an array of PromiseSettledResult for each task
 */
export function pLimit<T>(concurrency: number, tasks: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
  let index = 0;
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  const executing: Promise<void>[] = [];

  const runNext = async (): Promise<void> => {
    if (index >= tasks.length) return;
    const i = index++;
    const task = tasks[i];
    try {
      const value = await task();
      results[i] = { status: "fulfilled", value };
    } catch (reason) {
      results[i] = { status: "rejected", reason };
    }
    return runNext();
  };

  for (let i = 0; i < concurrency; i++) {
    const p = runNext();
    executing.push(p);
  }

  return Promise.all(executing).then(() => results);
}
