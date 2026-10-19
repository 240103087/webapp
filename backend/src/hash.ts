import bcrypt from "bcryptjs";

/** bcrypt cost: 10 normally, lower in tests (`BCRYPT_COST`) so the suite stays fast. */
const COST = Number(process.env.BCRYPT_COST ?? (process.env.NODE_ENV === "test" || process.env.VITEST ? 4 : 10));

export const hashSecret = (plain: string) => bcrypt.hash(plain, COST);
export const checkSecret = (plain: string, hash: string) => bcrypt.compare(plain, hash);
