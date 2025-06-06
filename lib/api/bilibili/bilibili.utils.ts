/**
 * 转换B站bvid为avid
 * 这种基础函数报错的可能性很小，不做处理
 */
export function bv2av(bvid: string): number {
  const XOR_CODE = 23442827791579n
  const MASK_CODE = 2251799813685247n
  const BASE = 58n

  const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'
  const bvidArr = Array.from(bvid)
  ;[bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]]
  ;[bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]]
  bvidArr.splice(0, 3)
  const tmp = bvidArr.reduce(
    (pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)),
    0n,
  )
  return Number((tmp & MASK_CODE) ^ XOR_CODE)
}

export function convertToFormDataString(data: Record<string, string>): string {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
}
