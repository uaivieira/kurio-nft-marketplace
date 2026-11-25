import { z } from 'zod'

export const favoritesList = z.object({ nftIds: z.array(z.string()) })
export type FavoritesList = z.infer<typeof favoritesList>
