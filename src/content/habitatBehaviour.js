import mainObservationUrl from '../assets/habitat-behaviour/photos/Main_Observation.webp'
import crossSpeciesFriendshipUrl from '../assets/habitat-behaviour/photos/Cross_Species_Friendship.webp'
import longDistanceCommunicationUrl from '../assets/habitat-behaviour/photos/Long_Distance_Communication.webp'
import nightPatrolUrl from '../assets/habitat-behaviour/photos/Night_Patrol.webp'
import restingNestUrl from '../assets/habitat-behaviour/photos/Resting_Nest.webp'
import groomingDisplayUrl from '../assets/habitat-behaviour/photos/Grooming_Before_Entering_Public_Habitat.webp'
import climbingInstinctUrl from '../assets/habitat-behaviour/photos/Climbing_Instinct.webp'
import packBondDiagramUrl from '../assets/habitat-behaviour/photos/Pack_Bond_Diagram.webp'
import petVideoUrl from '../assets/habitat-behaviour/videos/pet.mp4'
import helicopterVideoUrl from '../assets/habitat-behaviour/videos/helicopter.mp4'
import petPosterUrl from '../assets/habitat-behaviour/videos/pet.webp'
import helicopterPosterUrl from '../assets/habitat-behaviour/videos/helicopter.webp'

// Use display-sized WebPs so random dish changes remain light on GPU memory.
const chefFoodPhotoModules = import.meta.glob('../assets/food/optimized/*.webp', {
	eager: true,
	query: '?url',
	import: 'default',
})

const chefFoodPhotos = Object.entries(chefFoodPhotoModules)
	.sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
	.map(([, url]) => url)

export const HABITAT_BEHAVIOUR_TITLE = 'Habitat & Behaviour'

const habitatBehaviourLongExtract = `PREFERRED HABITAT
She does well almost anywhere with food, a comfortable place to sit and people she likes. Leafy areas are good for munching, while a blanket and a laptop make an ideal indoor nest.

DAILY ROUTINE
Long periods of resting are broken by sudden bursts of energy. These may include going outside to scavenge food, tripping over stuff, or yapping to her mate.

COMMUNICATION
Professional yapper. A single look can mean “feed me,” “leave me alone” or “you are in trouble.” Context is important.

MOVEMENT
Walking normally is optional. Curbs, rocks and low walls are often treated as high risk zones. Trees may also trigger an unexplained urge to climb or hug them.

RESTING BEHAVIOUR
When her battery hits zero, she burrows into a giant fortress of pillows and blankets. Do not poke the nest unless you brought fries or a sweet treat.

FIELD NOTE
The early drawing beside this board shows the basic pack bond: one trusted companion, one happy creature and one shared snack.`

export function habitatBehaviourGalleryData(title) {
	const normalizedTitle = String(title || '').trim().toLowerCase()
	if (normalizedTitle !== HABITAT_BEHAVIOUR_TITLE.toLowerCase()) return null

	return {
		room: {
			title: HABITAT_BEHAVIOUR_TITLE,
			extract:
				'A study and gallery of where she feels at home, how she communicates and her general behaviour.',
		},
		mainThumbnailUrl: mainObservationUrl,
		photos: [
			crossSpeciesFriendshipUrl,
			longDistanceCommunicationUrl,
			nightPatrolUrl,
			restingNestUrl,
			groomingDisplayUrl,
		],
		photoCaptions: [
			'dosto ka dost ballu don',
			'specimen without shaving cream',
			'thinks she can fly',
			'specimen marking territory',
			'specimen (trying) to seduce',
		],
		boardSidePhotos: [
			{ url: climbingInstinctUrl, caption: 'loves to climb thick wood' },
			{ url: packBondDiagramUrl, caption: 'ancient cave painting depicting her greed' },
		],
		videos: [
			{ url: petVideoUrl, posterUrl: petPosterUrl, caption: 'known to be kind to its siblings', wall: 'west', gap: 0.85 },
			{ url: helicopterVideoUrl, posterUrl: helicopterPosterUrl, caption: 'running from police', wall: 'west', gap: 0.85 },
		],
		chefFoodPhotos,
		hideInfoBoard: true,
		videoUrl: null,
		longExtract: habitatBehaviourLongExtract,
	}
}
