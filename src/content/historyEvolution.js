import evolutionTimelineUrl from '../assets/history-evolution/Evolution_Timeline.webp'
import historyPhoto1Url from '../assets/history-evolution/wall/1.webp'
import historyPhoto2Url from '../assets/history-evolution/wall/2.webp'
import historyPhoto3Url from '../assets/history-evolution/wall/3.webp'
import historyPhoto4Url from '../assets/history-evolution/wall/4.webp'
import historyPhoto5Url from '../assets/history-evolution/wall/5.webp'
import historyPhoto6Url from '../assets/history-evolution/wall/6.webp'
import historyPhoto7Url from '../assets/history-evolution/wall/7.webp'

export const HISTORY_EVOLUTION_TITLE = 'History & Evolution'

const historyEvolutionLongExtract = `SCIENTIFIC NAME: Potatus adorabilis

CONSERVATION STATUS: Extremely rare

CLOSEST LIVING RELATIVE: French fries

Long before the modern specimen appeared, her earliest known ancestors lived peacefully beneath the soil. These ancient potatoes were quiet, round and remarkably skilled at avoiding responsibilities. Their simple lives revolved around resting, absorbing warmth and waiting for snacks to happen nearby.

THE GREAT SPROUTING
After countless generations, one unusually ambitious potato produced its first sprouts. What began as tiny roots gradually became arms and legs. This evolutionary breakthrough allowed the species to travel toward food instead of waiting for food to arrive.

INHERITED ANCESTRAL TRAITS
The modern specimen thrives in comfortable habitats, becomes dangerous when hungry and requires regular affection, sunlight and snacks.`

export function historyEvolutionGalleryData(title) {
	const normalizedTitle = String(title || '').trim().toLowerCase()
	if (normalizedTitle !== HISTORY_EVOLUTION_TITLE.toLowerCase()) return null

	return {
		room: {
			title: HISTORY_EVOLUTION_TITLE,
			extract:
				'Millions of years ago, this extraordinary creature began as a humble potato. Follow the evidence from her ancient potato days to her highly evolved modern form.',
		},
		mainThumbnailUrl: evolutionTimelineUrl,
		photos: [historyPhoto1Url, historyPhoto2Url, historyPhoto3Url, historyPhoto4Url, historyPhoto5Url],
		photoCaptions: [
			'baby potato',
			'mischievious potato',
			'sassy potato',
			'yo yo potato singh',
			'pretty prettier prettiest ✨',
		],
		boardSidePhotos: [
			{ url: historyPhoto6Url, caption: '🐁 ichadhari mouse roop' },
			{ url: historyPhoto7Url, caption: '🐱 ichadhari catto roop' },
		],
		videoUrl: null,
		longExtract: historyEvolutionLongExtract,
	}
}
