const photoAssets = import.meta.glob('../assets/*/museum/photos/*.webp', {
	eager: true,
	query: '?url',
	import: 'default',
})

const videoAssets = import.meta.glob('../assets/*/museum/videos/*.mp4', {
	eager: true,
	query: '?url',
	import: 'default',
})

const posterAssets = import.meta.glob('../assets/*/museum/posters/*.webp', {
	eager: true,
	query: '?url',
	import: 'default',
})

const MEETINGS = [
	{ folder: 'one', title: 'Meeting One: Living Gallery' },
	{ folder: 'two', title: 'Meeting Two: Living Gallery' },
	{ folder: 'three', title: 'Meeting Three: Living Gallery' },
	{ folder: 'four', title: 'Meeting Four: Living Gallery' },
	{ folder: 'five', title: 'Meeting Five: Living Gallery' },
	{ folder: 'six', title: 'Meeting Six: Living Gallery' },
	{ folder: 'seven', title: 'Meeting Seven: Living Gallery' },
	{ folder: 'eight', title: 'Meeting Eight: Living Gallery' },
]

function assetFolder(path) {
	return path.match(/\/assets\/([^/]+)\/museum\//)?.[1] || ''
}

function assetOrientation(path) {
	return /_landscape\.[^./]+$/i.test(path) ? 'landscape' : 'portrait'
}

function assetStem(path) {
	return path.split('/').pop()?.replace(/\.[^./]+$/, '') || ''
}

function buildPools() {
	const pools = new Map()
	const poolFor = (folder) => {
		if (!pools.has(folder)) pools.set(folder, { photos: [], videos: [], posters: new Map() })
		return pools.get(folder)
	}

	for (const [path, url] of Object.entries(photoAssets)) {
		const folder = assetFolder(path)
		if (folder && typeof url === 'string') poolFor(folder).photos.push({ url, layout: assetOrientation(path) })
	}
	for (const [path, url] of Object.entries(posterAssets)) {
		const folder = assetFolder(path)
		if (folder && typeof url === 'string') poolFor(folder).posters.set(assetStem(path), url)
	}
	for (const [path, url] of Object.entries(videoAssets)) {
		const folder = assetFolder(path)
		if (!folder || typeof url !== 'string') continue
		const stem = assetStem(path)
		const pool = poolFor(folder)
		pool.videos.push({
			url,
			posterUrl: pool.posters.get(stem) || '',
			layout: assetOrientation(path),
		})
	}

	return pools
}

const meetingPools = buildPools()
const previousSelectionByFolder = new Map()

function randomUnit() {
	if (globalThis.crypto?.getRandomValues) {
		const value = new Uint32Array(1)
		globalThis.crypto.getRandomValues(value)
		return value[0] / 0x100000000
	}
	return Math.random()
}

function shuffled(items) {
	const copy = [...items]
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(randomUnit() * (i + 1))
		const value = copy[i]
		copy[i] = copy[j]
		copy[j] = value
	}
	return copy
}

function selectVideos(pool) {
	const targetCount = 8
	const portraits = shuffled(pool.videos.filter((entry) => entry.layout === 'portrait'))
	const landscapes = shuffled(pool.videos.filter((entry) => entry.layout === 'landscape'))
	const selectedPortraits = portraits.slice(0, 4)
	const selectedLandscapes = landscapes.slice(0, 4)
	const selected = [...selectedPortraits, ...selectedLandscapes]

	if (selected.length < targetCount) {
		const remaining = shuffled([
			...portraits.slice(selectedPortraits.length),
			...landscapes.slice(selectedLandscapes.length),
		])
		selected.push(...remaining.slice(0, targetCount - selected.length))
	}

	return shuffled(selected).map((entry) => ({ ...entry, caption: '' }))
}

export const MEETING_TITLES = MEETINGS.map(({ title }) => title)

export function meetingGalleryData(title) {
	const normalizedTitle = String(title || '').trim().toLowerCase()
	const meeting = MEETINGS.find((entry) => entry.title.toLowerCase() === normalizedTitle)
	if (!meeting) return null

	const pool = meetingPools.get(meeting.folder) || { photos: [], videos: [] }
	const hasMedia = pool.photos.length > 0 || pool.videos.length > 0

	let selection = null
	for (let attempt = 0; attempt < 6; attempt += 1) {
		const randomPhotos = shuffled(pool.photos)
		const cover = randomPhotos.shift()?.url || shuffled(pool.videos)[0]?.posterUrl || null
		const photos = randomPhotos.slice(0, 10).map((entry) => entry.url)
		const videos = selectVideos(pool)
		const signature = [cover, ...photos, ...videos.map((entry) => entry.url)].join('|')
		selection = { cover, photos, videos, signature }
		if (signature !== previousSelectionByFolder.get(meeting.folder)) break
	}
	previousSelectionByFolder.set(meeting.folder, selection.signature)

	return {
		room: {
			title: meeting.title,
			extract: hasMedia
				? 'A new selection from this meeting appears every time you enter.'
				: 'This meeting is ready for its future collection.',
		},
		mainThumbnailUrl: selection.cover,
		photos: selection.photos,
		photoCaptions: [],
		videos: selection.videos,
		tiktoks: [],
		hideCaptions: true,
		hideInfoBoard: true,
		hideTrailBoard: true,
		videoUrl: null,
		longExtract: '',
	}
}
