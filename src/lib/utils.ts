import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export const encodeBase64 = (str: string) =>
  btoa(unescape(encodeURIComponent(str)))

export const decodeBase64 = (str: string) =>
  decodeURIComponent(escape(atob(str)))

const date = new Date()
export const isChristmas = date.getMonth() === 11
