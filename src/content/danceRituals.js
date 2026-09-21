import elevatorWarmupVideoUrl from '../assets/dance/videos/01_elevator_warmup.mp4'
import elevatorConfidenceVideoUrl from '../assets/dance/videos/02_elevator_confidence.mp4'
import mirrorRehearsalVideoUrl from '../assets/dance/videos/03_mirror_rehearsal.mp4'
import stripedStepOneVideoUrl from '../assets/dance/videos/04_striped_step_one.mp4'
import stripedStepTwoVideoUrl from '../assets/dance/videos/05_striped_step_two.mp4'
import stripedFinaleVideoUrl from '../assets/dance/videos/06_striped_finale.mp4'
import pajamaPerformanceVideoUrl from '../assets/dance/videos/07_pajama_performance.mp4'
import chaosCamVideoUrl from '../assets/dance/videos/08_chaos_cam.mp4'
import nightDuetVideoUrl from '../assets/dance/videos/09_night_duet.mp4'
import crowdModeVideoUrl from '../assets/dance/videos/10_crowd_mode.mp4'
import elevatorFinalBossVideoUrl from '../assets/dance/videos/11_elevator_final_boss.mp4'
import couchPotatoComebackVideoUrl from '../assets/dance/videos/12_couch_potato_comeback.mp4'

import elevatorWarmupPosterUrl from '../assets/dance/posters/01_elevator_warmup.webp'
import elevatorConfidencePosterUrl from '../assets/dance/posters/02_elevator_confidence.webp'
import mirrorRehearsalPosterUrl from '../assets/dance/posters/03_mirror_rehearsal.webp'
import stripedStepOnePosterUrl from '../assets/dance/posters/04_striped_step_one.webp'
import stripedStepTwoPosterUrl from '../assets/dance/posters/05_striped_step_two.webp'
import stripedFinalePosterUrl from '../assets/dance/posters/06_striped_finale.webp'
import pajamaPerformancePosterUrl from '../assets/dance/posters/07_pajama_performance.webp'
import chaosCamPosterUrl from '../assets/dance/posters/08_chaos_cam.webp'
import nightDuetPosterUrl from '../assets/dance/posters/09_night_duet.webp'
import crowdModePosterUrl from '../assets/dance/posters/10_crowd_mode.webp'
import elevatorFinalBossPosterUrl from '../assets/dance/posters/11_elevator_final_boss.webp'
import couchPotatoComebackPosterUrl from '../assets/dance/posters/12_couch_potato_comeback.webp'

export const DANCE_RITUALS_TITLE = 'Dance Rituals'

const videos = [
	{
		url: elevatorWarmupVideoUrl,
		posterUrl: elevatorWarmupPosterUrl,
		caption: 'oye hoyee hoyee',
	},
	{
		url: elevatorConfidenceVideoUrl,
		posterUrl: elevatorConfidencePosterUrl,
		caption: 'hoyee oyee hoyee',
	},
	{
		url: mirrorRehearsalVideoUrl,
		posterUrl: mirrorRehearsalPosterUrl,
		caption: 'mirror ne bhi haar maan li',
		layout: 'landscape',
	},
	{
		url: stripedStepOneVideoUrl,
		posterUrl: stripedStepOnePosterUrl,
		caption: 'cutie patootie expressions',
	},
	{
		url: stripedStepTwoVideoUrl,
		posterUrl: stripedStepTwoPosterUrl,
		caption: 'started potato_moves.exe',
	},
	{
		url: stripedFinaleVideoUrl,
		posterUrl: stripedFinalePosterUrl,
		caption: '!!!!!!!!!!!!!',
	},
	{
		url: pajamaPerformanceVideoUrl,
		posterUrl: pajamaPerformancePosterUrl,
		caption: 'hawwwwwwwwwwww',
	},
	{
		url: chaosCamVideoUrl,
		posterUrl: chaosCamPosterUrl,
		caption: 'shamelessly humping in public',
	},
	{
		url: nightDuetVideoUrl,
		posterUrl: nightDuetPosterUrl,
		caption: 'dancing with her main chick',
	},
	{
		url: crowdModeVideoUrl,
		posterUrl: crowdModePosterUrl,
		caption: 'tappeya si !!!',
		layout: 'landscape',
	},
	{
		url: elevatorFinalBossVideoUrl,
		posterUrl: elevatorFinalBossPosterUrl,
		caption: 'elevator mob',
	},
	{
		url: couchPotatoComebackVideoUrl,
		posterUrl: couchPotatoComebackPosterUrl,
		caption: 'gamche m thumke',
	},
]

const tiktokVideoModules = import.meta.glob('../assets/dance/tiktoks/videos/*.mp4', {
	eager: true,
	query: '?url',
	import: 'default',
})
const tiktokPosterModules = import.meta.glob('../assets/dance/tiktoks/posters/*.webp', {
	eager: true,
	import: 'default',
})

const tiktoks = Object.entries(tiktokVideoModules)
	.sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
	.map(([videoPath, url], index) => {
		const posterPath = videoPath.replace('/videos/', '/posters/').replace(/\.mp4$/i, '.webp')
		return {
			url,
			posterUrl: tiktokPosterModules[posterPath] || '',
			caption: `certified cringe ${String(index + 1).padStart(2, '0')}`,
		}
	})

export function danceRitualsGalleryData(title) {
	const normalizedTitle = String(title || '').trim().toLowerCase()
	if (normalizedTitle !== DANCE_RITUALS_TITLE.toLowerCase()) return null

	return {
		room: {
			title: DANCE_RITUALS_TITLE,
			extract:
				'24x7 couch potato rehne ke baad kabhi kabhi isse dance ka chaska chadh jata hai. Dance aata hai ya nahi, confidence ko koi farak nahi padta.',
		},
		mainThumbnailUrl: null,
		photos: [],
		videos,
		tiktoks,
		hideInfoBoard: true,
		hideTrailBoard: true,
		videoUrl: null,
		longExtract: '',
	}
}
