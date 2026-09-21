import sleepVideoUrl from '../assets/sleep.mp4'
import foodRadarUrl from '../assets/anatomy-traits/photos/Food_Radar_Observed.webp'
import snackStorageBellyUrl from '../assets/anatomy-traits/photos/Snack_Storage_Belly_Observed.webp'
import maximumCutenessUrl from '../assets/anatomy-traits/photos/Maximum_Cuteness_Observed.webp'
import preBiteWarningUrl from '../assets/anatomy-traits/photos/Pre_Bite_Warning.webp'
import naturalHabitatUrl from '../assets/anatomy-traits/photos/Natural_Habitat.webp'
import calmDownReactionUrl from '../assets/anatomy-traits/photos/Reaction_To_Calm_Down.webp'
import momoDeprivationUrl from '../assets/anatomy-traits/photos/Momo_Deprivation_Symptoms.webp'

export const ANATOMY_TRAITS_TITLE = 'Anatomy & Traits'

const anatomyTraitsLongExtract = `GENERAL TRAITS
Hungry, sleepy and highly dangerous. She may look harmless, but getting too close puts you within biting range.

FOOD HABITS
She likes food in almost every form, the unhealthier the better. The sight or smell of a snack can revive her from the depths of hell.

THE BELLY
After a good meal, her belly can look a little pregnant. There is no mystery involved. It is just food (probably) (ask her bf).

CUTENESS
Her big eyes, smile and innocent face make it difficult to stay annoyed with her. This is an especially useful tactic after she has caused trouble.

ATTACK STYLE
Biting/Slapping are her preferred move. Inflicted wounds on victims can last for days. Keep yourself at a safe distance when snacks are involved.

KNOWN WEAKNESSES
Telling her to be "chill". Stairs. A normal road. Trees. Stones. Guns. Poison. DSA.

HOW TO APPROACH
Bring food, be nice and compliment her. If she tries to bite, offer momos and give her a moment.`

export function anatomyTraitsGalleryData(title) {
	const normalizedTitle = String(title || '').trim().toLowerCase()
	if (normalizedTitle !== ANATOMY_TRAITS_TITLE.toLowerCase()) return null

	return {
		room: {
			title: ANATOMY_TRAITS_TITLE,
			extract:
				'A closer look at this cute, food-loving creature, with a round belly and a predatory habit of biting people she likes.',
		},
		mainThumbnailUrl: sleepVideoUrl,
		photos: [foodRadarUrl, snackStorageBellyUrl, maximumCutenessUrl, preBiteWarningUrl, naturalHabitatUrl],
		photoCaptions: [
			'spotted snacking in a shadi',
			'shy shy when observed',
			'maximum cuteness to trap prey',
			'historians dunno tf this means',
			'specimen in natural habitat',
		],
		boardSidePhotos: [
			{ url: calmDownReactionUrl, caption: 'subject known to shed angoori tears' },
			{ url: momoDeprivationUrl, caption: 'food deprivation symptoms' },
		],
		videoUrl: null,
		longExtract: anatomyTraitsLongExtract,
	}
}
