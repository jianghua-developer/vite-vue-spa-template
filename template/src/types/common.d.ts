/** 通用标识类型 */
export type ID = string

/** 可空类型：T | null */
export type Nullable<T> = T | null

/** 深度部分可选 */
export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K]
}
