/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
// @ts-nocheck
export const immer = (initializer) => (set, get, store) =>
  initializer(
    (fn) => {
      set(fn)
    },
    get,
    store,
  )