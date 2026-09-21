import { startYourEngines } from './engine/engine.js'
import { fetchGalleryRoomData, setWikipediaLanguage } from './wiki/wiki.js'
import { HISTORY_EVOLUTION_TITLE, historyEvolutionGalleryData } from './content/historyEvolution.js'
import { ANATOMY_TRAITS_TITLE, anatomyTraitsGalleryData } from './content/anatomyTraits.js'
import { HABITAT_BEHAVIOUR_TITLE, habitatBehaviourGalleryData } from './content/habitatBehaviour.js'
import { DANCE_RITUALS_TITLE, danceRitualsGalleryData } from './content/danceRituals.js'
import { MEETING_TITLES, meetingGalleryData } from './content/meetingGallery.js'

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="scene-container">
  	<canvas id="scene" aria-label="3D scene"></canvas>
  </div>
  <div id="overlay" aria-label="Click to start">
	<div id="overlay-titlebar">
    <div id="overlay-titlebar-inner">
      <p>Sachi Dutta Memorial Institute & Gallery</p>
      <div id="language-picker" aria-label="Language">
        <span id="language-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
            <path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M12 3c3.5 3.5 3.5 14 0 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M12 3c-3.5 3.5-3.5 14 0 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
		<select id="language-select" aria-label="Language">
			<option value="en">English</option>
			<option value="de">Deutsch</option>
			<option value="es">Español</option>
			<option value="fr">Français</option>
			<option value="it">Italiano</option>
			<option value="ja">日本語</option>
			<option value="pl">Polski</option>
			<option value="pt">Português</option>
			<option value="ru">Русский</option>
			<option value="sr">Српски</option>
			<option value="zh">中文</option>
			<option value="ceb">Cebuano</option>
			<option value="sv">Svenska</option>
			<option value="nl">Nederlands</option>
		</select>
        <span id="language-caret" aria-hidden="true">▾</span>
      </div>
    </div>
	</div>
    <div id="overlay-inner">
      <div id="overlay-title">Click to play</div>
      <div id="overlay-sub">WASD/Arrows move · Mouse look · LEFT CLICK shoot/interact · SPACE jump · SHIFT sprint · ESCAPE unlock</div>
    </div>
	<div id="overlay-footer">
		<p>Made with 🍅 by Chief architect Aditya Gaur</a> · Cat model by <a href="https://sketchfab.com/omabuarts" target="_blank" rel="noreferrer">Omabuarts Studio</a></p>
	</div>
  </div>
  <div id="hud">
    <div id="crosshair" aria-hidden="true"></div>
  </div>
`

const canvas = document.querySelector('#scene')
const overlayEl = document.querySelector('#overlay-inner')
const crosshairEl = document.querySelector('#crosshair')
const languageSelectEl = document.querySelector('#language-select')

function requestPlay() {
	canvas.requestPointerLock()
}

overlayEl.addEventListener('click', requestPlay)
overlayEl.addEventListener('keydown', (e) => {
	if (e.code === 'Enter' || e.code === 'Space') requestPlay()
})

const LANGUAGE_PERSIST_KEY = 'museum:language:v1'

function baseLobbyCategoriesForLanguage(lang) {
	const languageCode = String(lang || '').trim().toLowerCase()
	switch (languageCode) {
		case 'en':
			return ['Culture', 'Geography', 'Animals', 'History', 'Nature', 'England', 'Philosophy', 'Cosmology', 'Society', 'Technology', 'Music', 'Painting'];
		case 'de':
			return ['Kultur', 'Geografie', 'Tiere', 'Geschichte', 'Natur', 'Deutschland', 'Philosophie', 'Kosmologie', 'Gesellschaft', 'Technologie', 'Musik', 'Malerei'];
		case 'es':
			return ['Cultura', 'Geografía', 'Animales', 'Historia', 'Naturaleza', 'España', 'Filosofía', 'Cosmología', 'Sociedad', 'Tecnología', 'Música', 'Pintura'];
		case 'fr':
			return ['Culture', 'Géographie', 'Animaux', 'Histoire', 'Nature', 'France', 'Philosophie', 'Cosmologie', 'Société', 'Technologie', 'Musique', 'Peinture'];
		case 'it':
			return ['Cultura', 'Geografia', 'Animali', 'Storia', 'Natura', 'Italia', 'Filosofia', 'Cosmologia', 'Società', 'Tecnologia', 'Musica', 'Pittura'];
		case 'ja':
			return ['文化', '地理', '動物', '歴史', '自然', '日本国', '哲学', '宇宙論', '社会', 'テクノロジー', '音楽', '絵画'];
		case 'pl':
			return ['Kultura', 'Geografia', 'Zwierzęta', 'Historia', 'Przyroda', 'Polska', 'Filozofia', 'Kosmologia', 'Społeczeństwo', 'Technologia', 'Muzyka', 'Malarstwo'];
		case 'pt':
			return ['Cultura', 'Geografia', 'Animais', 'História', 'Natureza', 'Portugal', 'Filosofia', 'Cosmologia', 'Sociedade', 'Tecnologia', 'Música', 'Pintura'];
		case 'ru':
			return ['Культура', 'География', 'Животные', 'История', 'Природа', 'Russia', 'Философия', 'Космология', 'Общество', 'Технологии', 'Музыка', 'Живопись'];
		case 'sr':
			return ['Култура', 'Географија', 'Животиње', 'Историја', 'Природа', 'Србија', 'Филозофија', 'Космологија', 'Друштво', 'Технологија', 'Музика', 'Сликарство'];
		case 'zh':
			return ['文化', '地理', '动物', '历史', '自然', '中华人民共和国', '哲学', '宇宙学', '社会', '科技', '音乐', '绘画'];
		case 'ceb':
			return ['Kultura', 'Heograpiya', 'Mga Mananap', 'Kasaysayan', 'Kinaiyahan', 'Pilipinas', 'Pilosopiya', 'Kosmolohiya', 'Sosyedad', 'Teknolohiya', 'Musika', 'Pamintal'];
		case 'sv':
			return ['Kultur', 'Geografi', 'Djur', 'Historia', 'Natur', 'Sverige', 'Filosofi', 'Kosmologi', 'Samhälle', 'Teknik', 'Musik', 'Måleri'];
		case 'nl':
			return ['Cultuur', 'Geografie', 'Dieren', 'Geschiedenis', 'Natuur', 'Nederland', 'Filosofie', 'Kosmologie', 'Samenleving', 'Technologie', 'Muziek', 'Schilderkunst'];
		default:
			return ['Culture', 'Geography', 'Animals', 'History', 'Nature', 'England', 'Philosophy', 'Cosmology', 'Society', 'Technology', 'Music', 'Painting'];;
	}
}

function museumSequenceForLanguage() {
	const [meetingOne, meetingTwo, meetingThree, meetingFour, meetingFive, meetingSix, meetingSeven, meetingEight] = MEETING_TITLES
	return [
		HISTORY_EVOLUTION_TITLE,
		ANATOMY_TRAITS_TITLE,
		HABITAT_BEHAVIOUR_TITLE,
		DANCE_RITUALS_TITLE,
		meetingOne,
		meetingTwo,
		meetingThree,
		meetingFour,
		meetingFive,
		meetingSix,
		meetingSeven,
		meetingEight,
	]
}

function lobbyCategoriesForLanguage() {
	const [
		history,
		anatomy,
		habitat,
		danceRituals,
		meetingOne,
		meetingTwo,
		meetingThree,
		meetingFour,
		meetingFive,
		meetingSix,
		meetingSeven,
		meetingEight,
	] = museumSequenceForLanguage()

	// The lobby stores each wall north-to-south. The visitor starts at the south
	// end of the west wall, so that wall is reversed to create one continuous path.
	return [
		meetingThree,
		meetingFour,
		meetingFive,
		meetingSix,
		meetingSeven,
		meetingEight,
		meetingTwo,
		meetingOne,
		danceRituals,
		habitat,
		anatomy,
		history,
	]
}

function adjacentCategoriesForTitle(title) {
	const categories = museumSequenceForLanguage(activeLanguage)
	if (categories.length === 0) return { previous: '', next: '' }

	const normalizedTitle = String(title || '').trim().toLowerCase()
	const foundIndex = categories.findIndex((category) => category.toLowerCase() === normalizedTitle)
	const index = foundIndex >= 0 ? foundIndex : 0

	return {
		previous: categories[(index - 1 + categories.length) % categories.length],
		next: categories[(index + 1) % categories.length],
	}
}

function loadUrlLanguage() {
	const raw = new URLSearchParams(window.location.search).get('language')
	return typeof raw === 'string' ? raw.trim() : ''
}

function loadPersistedLanguage() {
	try {
		const raw = window?.localStorage?.getItem(LANGUAGE_PERSIST_KEY)
		return typeof raw === 'string' ? raw.trim() : ''
	} catch {
		return ''
	}
}

function savePersistedLanguage(lang) {
	try {
		if (!window?.localStorage) return
		window.localStorage.setItem(LANGUAGE_PERSIST_KEY, String(lang || ''))
	} catch { }
}

const initialUrlLang = loadUrlLanguage()
const initialPersistedLang = loadPersistedLanguage()

let activeLanguage = setWikipediaLanguage(initialUrlLang || initialPersistedLang || 'en')
savePersistedLanguage(activeLanguage)

function syncLanguageFromUrlOrStorage() {
	const urlLang = loadUrlLanguage()
	const persistedLang = loadPersistedLanguage()
	const next = setWikipediaLanguage(urlLang || persistedLang || 'en')
	if (next !== activeLanguage) {
		activeLanguage = next
		savePersistedLanguage(activeLanguage)
		return {
			changed: true,
			value: activeLanguage
		}
	}
	savePersistedLanguage(activeLanguage)
	return {
		changed: false,
		value: activeLanguage
	}
}

function applyLanguage(nextLang, { persist = true, updateUrl = true, reloadToLobby = false } = {}) {
	const normalized = setWikipediaLanguage(nextLang)
	activeLanguage = normalized
	if (persist) savePersistedLanguage(activeLanguage)

	if (updateUrl) {
		setUrlAndState(null, { push: false })
	}

	if (reloadToLobby) {
		window.location.reload()
	}
}

languageSelectEl.value = activeLanguage
languageSelectEl.addEventListener('change', () => {
	applyLanguage(languageSelectEl.value, { persist: true, updateUrl: true, reloadToLobby: true })
})

const params = new URLSearchParams(window.location.search)
const initialTitle = params.get('exhibit')
let engineApi = null

const lobby_title = 'Lobby'

let wikiAbortController = null
let activeNavId = 0
let activeDoorLabelOverride = null

const trail_key_from_local_storage = 'museum:trail:v1'
const trail_maximum_length = 30

function loadTrailPersist() {
	try {
		const raw = window.localStorage.getItem(trail_key_from_local_storage)
		const parsed = JSON.parse(raw)
		const items = parsed.items ? parsed.items : parsed
		return items
			.map((t) => t.trim() || '')
			.filter(Boolean)
			.slice(-trail_maximum_length)
	} catch {
		return []
	}
}

function saveTrailPersist(trail) {
	const items = Array.isArray(trail) ? trail.slice(-trail_maximum_length) : []
	window.localStorage.setItem(trail_key_from_local_storage, JSON.stringify({ v: 1, items }))
}

let galleryTrail = loadTrailPersist()

function pushGalleryTrail(displayTitle) {
	const t = typeof displayTitle === 'string' ? displayTitle.trim() : ''
	if (!t) return
	const key = t.toLowerCase()
	const last = galleryTrail.length ? String(galleryTrail[galleryTrail.length - 1] || '') : ''
	if (last && last.toLowerCase() === key) return

	galleryTrail = [...galleryTrail, t]
	if (galleryTrail.length > trail_maximum_length) galleryTrail = galleryTrail.slice(-trail_maximum_length)
	saveTrailPersist(galleryTrail)
}

function setLoading(loading) {
	crosshairEl.classList.toggle('loading', Boolean(loading))
	if (engineApi && typeof engineApi.setInteractionLocked === 'function') {
		engineApi.setInteractionLocked(Boolean(loading))
	}
}

let historyIndex = 0

function setUrlAndState(title, { push = false } = {}) {
	const nextParams = new URLSearchParams(window.location.search)
	nextParams.set('language', activeLanguage)
	if (title) nextParams.set('exhibit', title)
	else nextParams.delete('exhibit')

	const q = nextParams.toString()
	const url = q ? `${window.location.pathname}?${q}` : window.location.pathname
	const nextState = { museum: true, idx: historyIndex, title: title || null }

	if (push) {
		historyIndex += 1
		nextState.idx = historyIndex
		window.history.pushState(nextState, '', url)
	} else {
		window.history.replaceState(nextState, '', url)
	}
}

function loadAndEnterGallery(title, { pushHistory = false, spawn, updateUrlState = true, loadingDoorId = null } = {}) {
	syncLanguageFromUrlOrStorage()

	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	if (wikiAbortController) wikiAbortController.abort()
	wikiAbortController = new AbortController()
	const navId = (activeNavId += 1)

	setLoading(true)

	const doorId = typeof loadingDoorId === 'string' ? loadingDoorId : ''
	if (doorId && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(doorId, 'Loading...')
		activeDoorLabelOverride = { doorId, navId }
	}

	const customGalleryData = historyEvolutionGalleryData(title)
		?? anatomyTraitsGalleryData(title)
		?? habitatBehaviourGalleryData(title)
		?? danceRitualsGalleryData(title)
		?? meetingGalleryData(title)
	const galleryDataRequest = customGalleryData
		? Promise.resolve(customGalleryData)
		: fetchGalleryRoomData(title, { signal: wikiAbortController.signal })

	galleryDataRequest
		.then((data) => {
			if (navId !== activeNavId) return

			const displayTitle = typeof data?.room?.title === 'string' ? data.room.title : title
			pushGalleryTrail(displayTitle)
			const trailForBoard = galleryTrail.slice(-3)
			const adjacentCategories = adjacentCategoriesForTitle(title)

			if (updateUrlState) {
				setUrlAndState(title, { push: Boolean(pushHistory) })
			}

			if (engineApi && typeof engineApi.setRoom === 'function') {
				engineApi.setRoom({
					roomMode: 'gallery',
					roomSeedTitle: title,
					galleryEntryWall: 'south',
					galleryAdjacentCategories: adjacentCategories,
					galleryTitle: displayTitle,
					galleryDescription: typeof data?.room?.extract === 'string' ? data.room.extract : '',
					galleryMainThumbnailUrl: typeof data?.mainThumbnailUrl === 'string' ? data.mainThumbnailUrl : null,
					galleryPhotos: Array.isArray(data?.photos) ? data.photos : [],
					galleryPhotoCaptions: Array.isArray(data?.photoCaptions) ? data.photoCaptions : null,
					galleryBoardSidePhotos: Array.isArray(data?.boardSidePhotos) ? data.boardSidePhotos : null,
					galleryVideoUrl: typeof data?.videoUrl === 'string' ? data.videoUrl : null,
					galleryVideos: Array.isArray(data?.videos) ? data.videos : [],
					galleryTiktoks: Array.isArray(data?.tiktoks) ? data.tiktoks : [],
					galleryChefFoodPhotos: Array.isArray(data?.chefFoodPhotos) ? data.chefFoodPhotos : [],
					galleryHideCaptions: data?.hideCaptions === true,
					galleryHideInfoBoard: data?.hideInfoBoard === true,
					galleryHideTrailBoard: data?.hideTrailBoard === true,
					galleryLongExtract: typeof data?.longExtract === 'string' ? data.longExtract : '',
					galleryTrail: trailForBoard,
					spawn,
				})
			}
		})
		.catch((err) => {
			if (err && err.code === 'aborted') return
			console.warn('[museum] Wiki fetch failed', err)
		})
		.finally(() => {
			if (navId !== activeNavId) return
			if (activeDoorLabelOverride && activeDoorLabelOverride.navId === navId && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
				engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
				activeDoorLabelOverride = null
			}
			setLoading(false)
		})
}

function enterlobby({ push = false } = {}) {
	if (wikiAbortController) {
		wikiAbortController.abort()
		wikiAbortController = null
	}
	activeNavId += 1

	pushGalleryTrail(lobby_title)

	if (activeDoorLabelOverride && engineApi && typeof engineApi.setDoorLabelOverride === 'function') {
		engineApi.setDoorLabelOverride(activeDoorLabelOverride.doorId, '')
		activeDoorLabelOverride = null
	}

	setUrlAndState(null, { push })
	if (engineApi && typeof engineApi.setRoom === 'function') {
		engineApi.setRoom({
			roomMode: 'lobby',
			lobbyCategories: lobbyCategoriesForLanguage(activeLanguage),
			spawn: {
				type: 'fromWall',
				wall: 'south'
			}
		})
	}
	setLoading(false)
}

function goBackInApp() {
	setLoading(true)
	if (historyIndex > 0) {
		window.history.back()
		return
	}
	enterlobby({ push: false })
	setLoading(false)
}

function requestRandomExhibit() {
	const categories = lobbyCategoriesForLanguage(activeLanguage)
	if (categories.length === 0) return

	const title = categories[Math.floor(Math.random() * categories.length)]
	loadAndEnterGallery(title, {
		pushHistory: true,
		spawn: { type: 'fromWall', wall: 'south' },
	})
}

engineApi = startYourEngines({
	canvas,
	roomSeedTitle: initialTitle ?? 'Lobby',
	roomMode: initialTitle ? 'gallery' : 'lobby',
	roomSpawn: { type: 'fromWall', wall: 'south' },
	lobbyCategories: lobbyCategoriesForLanguage(activeLanguage),
	onRandomExhibitRequested: requestRandomExhibit,
	onGoLobbyRequested() {
		enterlobby({ push: false })
	},
	onPointerLockChange(locked) {
		overlayEl.hidden = locked
		document.body.classList.toggle('locked', locked)
	},
	onDoorTrigger(door) {
		if (door && typeof door.category === 'string' && door.category.length > 0) {
			loadAndEnterGallery(door.category, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
				loadingDoorId: typeof door.id === 'string' ? door.id : null,
			})
			return
		}

		if (door && typeof door.articleTitle === 'string' && door.articleTitle.trim().length > 0) {
			const title = door.articleTitle.trim()
			loadAndEnterGallery(title, {
				pushHistory: true,
				spawn: { type: 'fromWall', wall: 'south' },
				loadingDoorId: typeof door.id === 'string' ? door.id : null,
			})
			return
		}

		if (door && door.target === 'back') {
			goBackInApp()
			return
		}

		if (door && door.target === 'lobby') {
			enterlobby({ push: true })
			return
		}
	},
})

if (!initialTitle) {
	pushGalleryTrail(lobby_title)
}

setUrlAndState(initialTitle ? initialTitle : null, { push: false })

window.addEventListener('popstate', (e) => {
	const { changed } = syncLanguageFromUrlOrStorage()

	const st = e?.state
	if (st && st.museum && typeof st.idx === 'number') {
		historyIndex = st.idx
	}

	const p = new URLSearchParams(window.location.search)
	const title = p.get('exhibit')

	if (title) {
		loadAndEnterGallery(title, {
			pushHistory: false,
			updateUrlState: false,
			spawn: { type: 'fromWall', wall: 'south' },
		})
		return
	}

	if (changed && engineApi && typeof engineApi.setRoom === 'function') {
		engineApi.setRoom({ roomMode: 'lobby', lobbyCategories: lobbyCategoriesForLanguage(activeLanguage) })
	}
	enterlobby({ push: false })
	setLoading(false)
})

if (initialTitle) {
	loadAndEnterGallery(initialTitle, {
		pushHistory: false,
		updateUrlState: false,
		spawn: { type: 'fromWall', wall: 'south' },
	})
}
