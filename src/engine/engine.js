import * as THREE from 'three'
import { buildRoom } from '../game/room.js'
import { disposeSharedRoomMaterialTextures } from '../game/room/textures.js'
import { hashStringToUint32, mulberry32, randRange, roundTo, setBodyClickableCursor } from '../misc/helper.js'

export function startYourEngines({
	canvas,
	onFps,
	onPointerLockChange,
	onHeading,
	onDoorTrigger,
	onRandomExhibitRequested,
	onGoLobbyRequested,
	roomSeedTitle = 'Lobby',
	roomMode = 'gallery',
	lobbyCategories,
	roomSpawn,
	galleryAdjacentCategories,
	galleryTitle,
	galleryDescription,
	galleryMainThumbnailUrl,
	galleryPhotos,
	galleryPhotoCaptions,
	galleryBoardSidePhotos,
	galleryVideoUrl,
	galleryVideos,
	galleryTiktoks,
	galleryChefFoodPhotos,
	galleryHideCaptions,
	galleryHideInfoBoard,
	galleryHideTrailBoard,
	galleryLongExtract,
}) {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	// Use a modest supersampling step on high-DPI displays for clearer photos and
	// text without returning to the much heavier uncapped render resolution.
	renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.2))

	if ('outputColorSpace' in renderer) {
		renderer.outputColorSpace = THREE.SRGBColorSpace
	}
	if ('toneMapping' in renderer) {
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.35
	}

	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x05030a)

	const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200)
	const eyeHeight = 1.7
	camera.position.set(0, eyeHeight, 3)
	camera.rotation.order = 'YXZ'
	scene.add(camera)

	const flashlightTarget = new THREE.Object3D()
	flashlightTarget.position.set(0, 0, -1)
	camera.add(flashlightTarget)

	const flashlight = new THREE.SpotLight(0xffffff, 3.0, 7, Math.PI / 80, 0.2, 1.6)
	flashlight.position.set(0, 0, 0)
	flashlight.target = flashlightTarget
	camera.add(flashlight)
	flashlight.visible = false
	let flashlightTimeoutId = 0

	const staticDisposables = []
	staticDisposables.push({
		dispose: disposeSharedRoomMaterialTextures,
	})

	const weaponRig = new THREE.Group()
	weaponRig.name = 'museum-blaster'
	const weaponRestPosition = new THREE.Vector3(0.34, -0.31, -0.58)
	weaponRig.position.copy(weaponRestPosition)
	weaponRig.visible = false
	camera.add(weaponRig)

	const gunDarkMat = new THREE.MeshStandardMaterial({
		color: 0x171a20,
		roughness: 0.34,
		metalness: 0.72,
		depthTest: false,
		depthWrite: false,
	})
	const gunMetalMat = new THREE.MeshStandardMaterial({
		color: 0x59616d,
		roughness: 0.24,
		metalness: 0.9,
		depthTest: false,
		depthWrite: false,
	})
	const gunAccentMat = new THREE.MeshBasicMaterial({
		color: 0x61e8ff,
		depthTest: false,
		depthWrite: false,
	})
	const muzzleFlashMat = new THREE.MeshBasicMaterial({
		color: 0xffd36a,
		transparent: true,
		opacity: 0.95,
		depthTest: false,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	})
	staticDisposables.push(gunDarkMat, gunMetalMat, gunAccentMat, muzzleFlashMat)

	function addGunPart(geometry, material, position, rotation = null) {
		const mesh = new THREE.Mesh(geometry, material)
		mesh.position.copy(position)
		if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z)
		mesh.renderOrder = 20000
		weaponRig.add(mesh)
		staticDisposables.push(geometry)
		return mesh
	}

	addGunPart(new THREE.BoxGeometry(0.18, 0.16, 0.48), gunDarkMat, new THREE.Vector3(0, 0, -0.08))
	addGunPart(new THREE.BoxGeometry(0.145, 0.075, 0.54), gunMetalMat, new THREE.Vector3(0, 0.07, -0.1))
	addGunPart(
		new THREE.BoxGeometry(0.12, 0.3, 0.14),
		gunDarkMat,
		new THREE.Vector3(0, -0.18, 0.03),
		new THREE.Euler(-0.2, 0, 0)
	)
	addGunPart(new THREE.BoxGeometry(0.105, 0.025, 0.3), gunAccentMat, new THREE.Vector3(0, 0.071, -0.09))
	addGunPart(
		new THREE.CylinderGeometry(0.042, 0.042, 0.22, 16),
		gunMetalMat,
		new THREE.Vector3(0, 0.025, -0.43),
		new THREE.Euler(Math.PI / 2, 0, 0)
	)

	const muzzleAnchor = new THREE.Object3D()
	muzzleAnchor.position.set(0, 0.025, -0.56)
	weaponRig.add(muzzleAnchor)

	const muzzleFlashGeo = new THREE.OctahedronGeometry(0.085, 0)
	const muzzleFlash = new THREE.Mesh(muzzleFlashGeo, muzzleFlashMat)
	muzzleFlash.scale.set(0.8, 0.8, 1.8)
	muzzleFlash.renderOrder = 20001
	muzzleFlash.visible = false
	muzzleAnchor.add(muzzleFlash)
	staticDisposables.push(muzzleFlashGeo)

	const muzzleLight = new THREE.PointLight(0xffb347, 0, 3.2, 2)
	muzzleAnchor.add(muzzleLight)

	let weaponRecoil = 0
	let muzzleFlashTime = 0
	let firingClassTimeoutId = 0
	let hitConfirmTimeoutId = 0
	let shotAudioContext = null

	let currentRoom = null
	let halfW = 6
	let halfL = 6
	let doorById = new Map()
	let doorHitMeshes = []
	let doorHitById = new Map()
	let roomObstacles = []
	let pickableMeshes = []
	const interactionCandidates = []
	let interactionCandidateCount = -1
	let interactionLocked = false
	const shotEffects = []

	let deferredTextureLoadToken = 0

	function loadTextureAsync(url) {
		const loader = new THREE.TextureLoader()
		if (typeof loader.setCrossOrigin === 'function') loader.setCrossOrigin('anonymous')
		return new Promise((resolve, reject) => {
			loader.load(url, resolve, undefined, reject)
		})
	}

	async function runDeferredTextureLoads(room, token) {
		const jobs = Array.isArray(room?.deferredTextureLoads) ? room.deferredTextureLoads : []
		if (jobs.length === 0) return

		// Large mixed-media rooms upload textures gradually to avoid an entry-time GPU spike.
		const staggerMs = jobs.length >= 10 ? 180 : 90

		for (const job of jobs) {
			if (token !== deferredTextureLoadToken) return
			if (currentRoom !== room) return

			const url = typeof job?.url === 'string' ? job.url.trim() : ''
			if (!url) continue


			await new Promise((r) => window.requestAnimationFrame(r))
			if (token !== deferredTextureLoadToken || currentRoom !== room) return

			try {
				const tex = await loadTextureAsync(url)
				if (token !== deferredTextureLoadToken || currentRoom !== room) {
					if (tex && typeof tex.dispose === 'function') tex.dispose()
					return
				}
				if (job && typeof job.onLoad === 'function') job.onLoad(tex)
				else if (tex && typeof tex.dispose === 'function') tex.dispose()
			} catch (err) {
				if (token !== deferredTextureLoadToken || currentRoom !== room) return
				if (job && typeof job.onError === 'function') job.onError(err)
			}

			if (staggerMs > 0) {
				await new Promise((r) => window.setTimeout(r, staggerMs))
			}
		}
	}

	const holdAnchor = new THREE.Object3D()
	holdAnchor.position.set(0, 0, -0.6)
	camera.add(holdAnchor)

	let held = null

	function forEachMaterial(obj, fn) {
		if (!obj) return
		obj.traverse((child) => {
			const m = child && child.material
			if (!m) return
			if (Array.isArray(m)) {
				for (const mm of m) fn(mm, child)
			} else {
				fn(m, child)
			}
		})
	}

	function releaseHeld() {
		if (!held) return
		const {
			obj,
			originalParent,
			originalPosition,
			originalQuaternion,
			originalScale,
			originalRenderOrder,
			originalMaterialState,
		} = held

		if (obj && obj.parent) {
			obj.parent.remove(obj)
		}

		if (originalParent) {
			originalParent.add(obj)
			obj.position.copy(originalPosition)
			obj.quaternion.copy(originalQuaternion)
			obj.scale.copy(originalScale)
		}

		if (obj) {
			obj.renderOrder = originalRenderOrder
			forEachMaterial(obj, (mat, child) => {
				const state = originalMaterialState.get(mat)
				if (!state) return
				mat.depthTest = state.depthTest
				mat.depthWrite = state.depthWrite
				if ('transparent' in mat) mat.transparent = state.transparent
				if ('opacity' in mat) mat.opacity = state.opacity
				if (child) child.renderOrder = state.renderOrder
				mat.needsUpdate = true
			})
		}

		held = null
	}

	function holdObject(obj) {
		if (!obj) return

		if (held && held.obj === obj) {
			releaseHeld()
			return
		}

		if (held) releaseHeld()

		const originalParent = obj.parent
		const originalPosition = obj.position.clone()
		const originalQuaternion = obj.quaternion.clone()
		const originalScale = obj.scale.clone()
		const originalRenderOrder = obj.renderOrder
		const originalMaterialState = new Map()

		if (originalParent) originalParent.remove(obj)
		holdAnchor.add(obj)
		obj.position.set(0, 0, 0)
		obj.quaternion.identity()
		obj.scale.copy(originalScale)

		obj.renderOrder = 9999
		forEachMaterial(obj, (mat, child) => {
			if (!originalMaterialState.has(mat)) {
				originalMaterialState.set(mat, {
					depthTest: mat.depthTest,
					depthWrite: mat.depthWrite,
					transparent: 'transparent' in mat ? mat.transparent : undefined,
					opacity: 'opacity' in mat ? mat.opacity : undefined,
					renderOrder: child ? child.renderOrder : 0,
				})
			}

			mat.depthTest = false
			mat.depthWrite = false
			if ('transparent' in mat) mat.transparent = true
			if ('opacity' in mat) mat.opacity = Math.min(1, mat.opacity ?? 1)
			if (child) child.renderOrder = 9999
			mat.needsUpdate = true
		})

		holdAnchor.updateWorldMatrix(true, true)
		obj.updateWorldMatrix(true, true)

		const box = new THREE.Box3().setFromObject(obj)
		const size = new THREE.Vector3()
		const centerWorld = new THREE.Vector3()
		box.getSize(size)

		box.getCenter(centerWorld)
		const centerInHold = holdAnchor.worldToLocal(centerWorld.clone())
		obj.position.sub(centerInHold)
		obj.updateWorldMatrix(true, true)

		const baseDistance = Math.max(0.35, (camera.near ?? 0.1) + 0.15)
		const depthPad = (size.z || 0) * 0.5
		const distance = Math.max(baseDistance, (camera.near ?? 0.1) + 0.1 + depthPad)
		holdAnchor.position.set(0, 0, -distance)

		const vFovRad = THREE.MathUtils.degToRad((camera.fov || 60) * 0.5)
		const viewHeight = 2 * distance * Math.tan(vFovRad)
		const viewWidth = viewHeight * (camera.aspect || 1)

		const safeW = (size.x || 1e-6)
		const safeH = (size.y || 1e-6)

		const marginPx = 50
		const vw = canvas.clientWidth || 0
		const vh = canvas.clientHeight || 0
		const padX = vw > 0 ? Math.max(0.1, (vw - 2 * marginPx) / vw) : 0.94
		const padY = vh > 0 ? Math.max(0.1, (vh - 2 * marginPx) / vh) : 0.94

		const scaleToFit = Math.min((viewWidth * padX) / safeW, (viewHeight * padY) / safeH)
		if (Number.isFinite(scaleToFit) && scaleToFit > 0) {
			obj.scale.copy(originalScale).multiplyScalar(scaleToFit)
		}

		obj.updateWorldMatrix(true, true)
		box.setFromObject(obj)
		box.getCenter(centerWorld)
		const centerInHoldAfterScale = holdAnchor.worldToLocal(centerWorld.clone())
		obj.position.sub(centerInHoldAfterScale)

		held = {
			obj,
			originalParent,
			originalPosition,
			originalQuaternion,
			originalScale,
			originalRenderOrder,
			originalMaterialState,
		}
	}

	let yaw = 0
	let pitch = 0

	const velocity = new THREE.Vector3(0, 0, 0)
	const gravity = -18
	const jumpSpeed = 6.2
	const moveSpeed = 4.2
	const sprintMultiplier = 1.75
	let grounded = false

	function disposeMany(items) {
		for (const d of items) {
			if (d && typeof d.dispose === 'function') d.dispose()
		}
	}

	function yawForFacingWall(wall) {
		if (wall === 'south') return 0
		if (wall === 'north') return Math.PI
		if (wall === 'west') return Math.PI / 2
		if (wall === 'east') return -Math.PI / 2
		return 0
	}

	function applySpawn(spawn) {
		if (!spawn) return

		if (spawn.type === 'center') {
			camera.position.set(0, eyeHeight, 0)
			yaw = typeof spawn.yaw === 'number' ? spawn.yaw : 0
			pitch = typeof spawn.pitch === 'number' ? spawn.pitch : 0
			camera.rotation.y = yaw
			camera.rotation.x = pitch
			velocity.set(0, 0, 0)
			grounded = true
			return
		}

		if (spawn.type === 'fromWall') {
			const wall = spawn.wall
			const margin = 1.5

			let x = 0
			let z = 0
			if (wall === 'west') x = -halfW + margin
			else if (wall === 'east') x = halfW - margin
			else if (wall === 'north') z = -halfL + margin
			else if (wall === 'south') z = halfL - margin

			camera.position.set(x, eyeHeight, z)
			yaw = yawForFacingWall(wall)
			pitch = 0
			camera.rotation.y = yaw
			camera.rotation.x = pitch
			velocity.set(0, 0, 0)
			grounded = true
		}
	}

	function loadRoom({
		mode,
		seedTitle,
		categories,
		galleryEntryWall,
		galleryAdjacentCategories: adjacentCategories,
		galleryTitle: nextGalleryTitle,
		galleryDescription: nextGalleryDescription,
		galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
		galleryPhotos: nextGalleryPhotos,
		galleryPhotoCaptions: nextGalleryPhotoCaptions,
		galleryBoardSidePhotos: nextGalleryBoardSidePhotos,
		galleryVideoUrl: nextGalleryVideoUrl,
		galleryVideos: nextGalleryVideos,
		galleryTiktoks: nextGalleryTiktoks,
		galleryChefFoodPhotos: nextGalleryChefFoodPhotos,
		galleryHideCaptions: nextGalleryHideCaptions,
		galleryHideInfoBoard: nextGalleryHideInfoBoard,
		galleryHideTrailBoard: nextGalleryHideTrailBoard,
		galleryLongExtract: nextGalleryLongExtract,
		galleryTrail: nextGalleryTrail,
		spawn,
	}) {
		const wallThickness = 0.2

		let roomWidth = 21
		let roomLength = 18
		let roomHeight = 4

		if (mode === 'lobby') {
			const catCount = Array.isArray(categories) ? categories.length : 0
			const doorsPerSide = Math.max(1, Math.ceil(catCount / 2))

			const doorW = 1.25
			const gapU = 1.1
			const extraEachSide = 2.0

			const spanNeeded = doorsPerSide * doorW + Math.max(0, doorsPerSide - 1) * gapU
			roomLength = roundTo(spanNeeded + extraEachSide * 3, 0.25)
		} else {
			const seed = hashStringToUint32(String(seedTitle))
			const rand = mulberry32(seed)

			roomWidth = roundTo(randRange(rand, 12, 18), 0.25) // west-east
			roomLength = roundTo(randRange(rand, 14, 16), 0.25) // south-north
		}

		// Cancel outstanding texture work and free the previous room before allocating
		// the next one. Keeping both alive during construction can exceed GPU memory in
		// media-heavy galleries.
		deferredTextureLoadToken += 1
		const roomLoadToken = deferredTextureLoadToken

		if (currentRoom) {
			if (held) releaseHeld()
			clearShotEffects()
			scene.remove(currentRoom.group)
			disposeMany(currentRoom.disposables)
			currentRoom = null
			if (renderer.renderLists && typeof renderer.renderLists.dispose === 'function') {
				renderer.renderLists.dispose()
			}
		}

		const nextRoom = buildRoom({
			width: roomWidth,
			length: roomLength,
			height: roomHeight,
			wallThickness,
			mode,
			lobby: {
				categories,
			},
			gallery: {
				entryWall: galleryEntryWall,
				adjacentCategories,
				title: nextGalleryTitle,
				description: nextGalleryDescription,
				mainThumbnailUrl: nextGalleryMainThumbnailUrl,
				photos: nextGalleryPhotos,
				photoCaptions: nextGalleryPhotoCaptions,
				boardSidePhotos: nextGalleryBoardSidePhotos,
				videoUrl: nextGalleryVideoUrl,
				videos: nextGalleryVideos,
				tiktoks: nextGalleryTiktoks,
				chefFoodPhotos: nextGalleryChefFoodPhotos,
				hideCaptions: nextGalleryHideCaptions === true,
				hideInfoBoard: nextGalleryHideInfoBoard === true,
				hideTrailBoard: nextGalleryHideTrailBoard === true,
				longExtract: nextGalleryLongExtract,
				trail: Array.isArray(nextGalleryTrail) ? nextGalleryTrail : [],
			},
		})
		currentRoom = nextRoom
		scene.add(currentRoom.group)

		void runDeferredTextureLoads(currentRoom, roomLoadToken)

		halfW = currentRoom.bounds?.halfW ?? halfW
		halfL = currentRoom.bounds?.halfL ?? halfL

		const doors = Array.isArray(currentRoom.doors) ? currentRoom.doors : []
		doorById = new Map(doors.map((d) => [d.id, d]))
		doorHitMeshes = Array.isArray(currentRoom.doorHitMeshes) ? currentRoom.doorHitMeshes : []
		doorHitById = new Map(
			doorHitMeshes
				.map((m) => {
					const id = m?.userData?.doorId
					return typeof id === 'string' && id ? [id, m] : null
				})
				.filter(Boolean)
		)
		roomObstacles = Array.isArray(currentRoom.obstacles) ? currentRoom.obstacles : []
		pickableMeshes = Array.isArray(currentRoom.pickableMeshes) ? currentRoom.pickableMeshes : []
		interactionCandidateCount = -1

		applySpawn(spawn)
	}

	loadRoom({
		mode: roomMode,
		seedTitle: roomSeedTitle,
		categories: lobbyCategories,
		galleryAdjacentCategories,
		galleryTitle,
		galleryDescription,
		galleryMainThumbnailUrl,
		galleryPhotos,
		galleryPhotoCaptions,
		galleryBoardSidePhotos,
		galleryVideoUrl,
		galleryVideos,
		galleryTiktoks,
		galleryChefFoodPhotos,
		galleryHideCaptions,
		galleryHideInfoBoard,
		galleryHideTrailBoard,
		galleryLongExtract,
		spawn: roomSpawn,
	})
	const raycaster = new THREE.Raycaster()
	const rayNdc = new THREE.Vector2(0, 0)

	function disposeShotEffect(effect) {
		if (!effect) return
		if (effect.object?.parent) effect.object.parent.remove(effect.object)
		for (const disposable of effect.disposables || []) {
			if (disposable && typeof disposable.dispose === 'function') disposable.dispose()
		}
	}

	function clearShotEffects() {
		while (shotEffects.length > 0) disposeShotEffect(shotEffects.pop())
	}

	function addTracer(start, end) {
		const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
		const material = new THREE.LineBasicMaterial({
			color: 0x8df3ff,
			transparent: true,
			opacity: 0.9,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		})
		const line = new THREE.Line(geometry, material)
		line.renderOrder = 15000
		scene.add(line)
		shotEffects.push({ object: line, age: 0, duration: 0.075, disposables: [geometry, material] })
	}

	function worldNormalForHit(hit) {
		if (hit?.face?.normal && hit?.object) {
			const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
			return hit.face.normal.clone().applyMatrix3(normalMatrix).normalize()
		}
		return raycaster.ray.direction.clone().negate().normalize()
	}

	function addImpact(hit) {
		if (!hit?.point) return

		const normal = worldNormalForHit(hit)
		const group = new THREE.Group()
		group.position.copy(hit.point).addScaledVector(normal, 0.012)
		group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

		const markGeo = new THREE.CircleGeometry(0.028, 14)
		const markMat = new THREE.MeshBasicMaterial({
			color: 0x070707,
			transparent: true,
			opacity: 0.9,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
		})
		const mark = new THREE.Mesh(markGeo, markMat)
		group.add(mark)

		const glowGeo = new THREE.RingGeometry(0.03, 0.062, 18)
		const glowMat = new THREE.MeshBasicMaterial({
			color: 0xffb347,
			transparent: true,
			opacity: 1,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			side: THREE.DoubleSide,
		})
		const glow = new THREE.Mesh(glowGeo, glowMat)
		glow.position.z = 0.002
		group.add(glow)

		const sparkCount = 9
		const sparkPositions = new Float32Array(sparkCount * 3)
		const sparkVelocities = []
		for (let i = 0; i < sparkCount; i += 1) {
			const spread = new THREE.Vector3(
				(Math.random() - 0.5) * 1.5,
				(Math.random() - 0.5) * 1.5,
				0.8 + Math.random() * 1.7
			)
			sparkVelocities.push(spread)
		}
		const sparkGeo = new THREE.BufferGeometry()
		sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
		const sparkMat = new THREE.PointsMaterial({
			color: 0xffd36a,
			size: 0.045,
			transparent: true,
			opacity: 1,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true,
		})
		const sparks = new THREE.Points(sparkGeo, sparkMat)
		sparks.position.z = 0.005
		group.add(sparks)

		scene.add(group)
		shotEffects.push({
			object: group,
			age: 0,
			duration: 7,
			disposables: [markGeo, markMat, glowGeo, glowMat, sparkGeo, sparkMat],
			update(dt, age) {
				glowMat.opacity = Math.max(0, 1 - age * 5)
				glow.scale.setScalar(1 + Math.min(1, age * 5))
				sparkMat.opacity = Math.max(0, 1 - age * 4)
				if (age < 0.45) {
					const attr = sparkGeo.getAttribute('position')
					for (let i = 0; i < sparkCount; i += 1) {
						const velocity = sparkVelocities[i]
						velocity.y -= 2.2 * dt
						attr.setXYZ(
							i,
							attr.getX(i) + velocity.x * dt,
							attr.getY(i) + velocity.y * dt,
							attr.getZ(i) + velocity.z * dt
						)
					}
					attr.needsUpdate = true
				}
				if (age > 5.5) markMat.opacity = Math.max(0, (7 - age) / 1.5)
			},
		})

		while (shotEffects.length > 42) disposeShotEffect(shotEffects.shift())
	}

	function playShotSound() {
		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (!AudioContextClass) return
			if (!shotAudioContext) shotAudioContext = new AudioContextClass()
			if (shotAudioContext.state === 'suspended') void shotAudioContext.resume()

			const now = shotAudioContext.currentTime
			const duration = 0.09
			const buffer = shotAudioContext.createBuffer(1, Math.ceil(shotAudioContext.sampleRate * duration), shotAudioContext.sampleRate)
			const data = buffer.getChannelData(0)
			for (let i = 0; i < data.length; i += 1) {
				const decay = 1 - i / data.length
				data[i] = (Math.random() * 2 - 1) * decay * decay
			}

			const noise = shotAudioContext.createBufferSource()
			const noiseGain = shotAudioContext.createGain()
			noise.buffer = buffer
			noiseGain.gain.setValueAtTime(0.2, now)
			noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
			noise.connect(noiseGain).connect(shotAudioContext.destination)
			noise.start(now)

			const thump = shotAudioContext.createOscillator()
			const thumpGain = shotAudioContext.createGain()
			thump.type = 'triangle'
			thump.frequency.setValueAtTime(115, now)
			thump.frequency.exponentialRampToValueAtTime(48, now + 0.08)
			thumpGain.gain.setValueAtTime(0.16, now)
			thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
			thump.connect(thumpGain).connect(shotAudioContext.destination)
			thump.start(now)
			thump.stop(now + 0.11)
		} catch {
			// Audio is an enhancement; shooting still works if the browser blocks it.
		}
	}

	function fireWeapon(hit) {
		weaponRecoil = 1
		muzzleFlashTime = 0.065
		muzzleFlash.visible = true
		muzzleFlash.rotation.z = Math.random() * Math.PI
		muzzleLight.intensity = 5

		flashlight.visible = true
		if (flashlightTimeoutId) window.clearTimeout(flashlightTimeoutId)
		flashlightTimeoutId = window.setTimeout(() => {
			flashlight.visible = false
			flashlightTimeoutId = 0
		}, 90)

		if (firingClassTimeoutId) window.clearTimeout(firingClassTimeoutId)
		document.body.classList.add('weapon-firing')
		firingClassTimeoutId = window.setTimeout(() => {
			document.body.classList.remove('weapon-firing')
			firingClassTimeoutId = 0
		}, 75)

		camera.updateWorldMatrix(true, true)
		const start = muzzleAnchor.getWorldPosition(new THREE.Vector3())
		const end = hit?.point
			? hit.point.clone()
			: raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 35)
		addTracer(start, end)
		if (hit) addImpact(hit)
		playShotSound()
	}

	function updateWeaponAndShots(dt) {
		weaponRecoil = Math.max(0, weaponRecoil - dt * 9.5)
		const recoilCurve = Math.sin(weaponRecoil * Math.PI)
		weaponRig.position.copy(weaponRestPosition)
		weaponRig.position.z += recoilCurve * 0.11
		weaponRig.rotation.x = recoilCurve * 0.16
		weaponRig.rotation.z = recoilCurve * -0.045

		muzzleFlashTime = Math.max(0, muzzleFlashTime - dt)
		muzzleFlash.visible = muzzleFlashTime > 0
		muzzleLight.intensity = muzzleFlashTime > 0 ? 5 * (muzzleFlashTime / 0.065) : 0

		for (let i = shotEffects.length - 1; i >= 0; i -= 1) {
			const effect = shotEffects[i]
			effect.age += dt
			if (typeof effect.update === 'function') effect.update(dt, effect.age)
			if (effect.age < effect.duration) continue
			disposeShotEffect(effect)
			shotEffects.splice(i, 1)
		}
	}

	function raycastRoom(ndc = rayNdc) {
		raycaster.setFromCamera(ndc, camera)
		if (!currentRoom?.group) return null
		const hits = raycaster.intersectObject(currentRoom.group, true)
		return hits.length > 0 ? hits[0] : null
	}

	function syncInteractionCandidates() {
		const candidateCount = doorHitMeshes.length + pickableMeshes.length
		if (candidateCount === interactionCandidateCount) return

		interactionCandidates.length = 0
		interactionCandidates.push(...doorHitMeshes, ...pickableMeshes)
		interactionCandidateCount = candidateCount
	}

	const aimAssistOffsets = [
		[0, 0],
		[-0.025, 0],
		[0.025, 0],
		[0, -0.025],
		[0, 0.025],
		[-0.018, -0.018],
		[0.018, -0.018],
		[-0.018, 0.018],
		[0.018, 0.018],
	]
	const assistedRayNdc = new THREE.Vector2()

	function raycastInteraction() {
		syncInteractionCandidates()
		if (interactionCandidates.length === 0) return null

		for (const [offsetX, offsetY] of aimAssistOffsets) {
			assistedRayNdc.set(offsetX, offsetY)
			raycaster.setFromCamera(assistedRayNdc, camera)
			const interactionHits = raycaster.intersectObjects(interactionCandidates, true)
			if (interactionHits.length === 0) continue

			const interactionHit = interactionHits[0]
			// Nothing at or beyond the original 0.22 allowance boundary can occlude
			// this interaction. Using that boundary as the far limit avoids testing
			// the rest of the room without changing target selection or aim assist.
			const previousFar = raycaster.far
			raycaster.far = Math.max(raycaster.near, interactionHit.distance - 0.22)
			const worldHits = currentRoom?.group ? raycaster.intersectObject(currentRoom.group, true) : []
			raycaster.far = previousFar
			const worldHit = worldHits[0] ?? null

			// Frames and backplates often sit a few centimetres in front of their
			// invisible controls. A small allowance keeps those controls easy to hit,
			// while a real foreground object or wall still blocks the shot.
			if (worldHit && interactionHit.distance > worldHit.distance + 0.22) continue
			return interactionHit
		}

		return null
	}

	function computeIsAimingAtClickable() {
		if (!isPointerLocked()) return false
		if (interactionLocked) return false
		if (held) return true

		return Boolean(raycastInteraction())
	}

	const keysDown = new Set()
	let jumpRequested = false
	let lastInteractionAtMs = performance.now()

	function onKeyDown(e) {
		lastInteractionAtMs = performance.now()
		keysDown.add(e.code)
		if (e.code === 'Space') jumpRequested = true
	}

	function onKeyUp(e) {
		keysDown.delete(e.code)
	}

	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('keyup', onKeyUp)

	const mouseSensitivity = 0.0022

	function headingFromYaw(yawRad) {
		let deg = ((-yawRad * 180) / Math.PI) % 360
		if (deg < 0) deg += 360
		const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
		const idx = Math.round(deg / 45) % 8
		return { cardinal: dirs[idx] }
	}

	function isPointerLocked() {
		return document.pointerLockElement === canvas
	}

	function onMouseMove(e) {
		if (!isPointerLocked()) return
		lastInteractionAtMs = performance.now()

		yaw -= e.movementX * mouseSensitivity
		pitch -= e.movementY * mouseSensitivity

		const limit = Math.PI / 2 - 0.01
		pitch = Math.max(-limit, Math.min(limit, pitch))

		camera.rotation.y = yaw
		camera.rotation.x = pitch
	}

	window.addEventListener('mousemove', onMouseMove)

	function handlePointerLockChange() {
		const locked = isPointerLocked()
		lastInteractionAtMs = performance.now()
		weaponRig.visible = locked
		if (typeof onPointerLockChange === 'function') {
			onPointerLockChange(locked)
		}
	}

	document.addEventListener('pointerlockchange', handlePointerLockChange)
	handlePointerLockChange()

	function findDoorId(obj) {
		let cur = obj
		while (cur) {
			if (cur.userData && typeof cur.userData.doorId === 'string') return cur.userData.doorId
			cur = cur.parent
		}
		return null
	}

	function doorHasTriggerTarget(door) {
		if (!door || typeof door !== 'object') return false
		const articleTitle = typeof door.articleTitle === 'string' ? door.articleTitle.trim() : ''
		const category = typeof door.category === 'string' ? door.category.trim() : ''
		const target = typeof door.target === 'string' ? door.target.trim() : ''
		return Boolean(articleTitle || category || target)
	}

	function onMouseDown(e) {
		if (e.button !== 0) return
		if (!isPointerLocked()) return
		if (interactionLocked) return
		lastInteractionAtMs = performance.now()

		const worldHit = raycastRoom()
		const interactionHit = raycastInteraction()
		const hit = interactionHit || worldHit
		fireWeapon(hit)
		if (interactionHit) {
			if (hitConfirmTimeoutId) window.clearTimeout(hitConfirmTimeoutId)
			document.body.classList.add('shot-confirmed')
			hitConfirmTimeoutId = window.setTimeout(() => {
				document.body.classList.remove('shot-confirmed')
				hitConfirmTimeoutId = 0
			}, 130)
		}

		if (held) {
			releaseHeld()
			return
		}
		if (!hit) return

		const hitObj = hit.object
		const hitPoint = hit.point

		{
			let cur = hitObj
			while (cur) {
				const onClick = cur?.userData?.onClick
				if (typeof onClick === 'function') {
					try {
						onClick({ object: cur, hitObject: hitObj, hitPoint, camera })
					} catch (err) {
						console.warn('[linkwalk] onClick handler failed', err)
					}
					return
				}

				const action = cur?.userData?.action
				if (action === 'random-exhibit') {
					if (typeof onRandomExhibitRequested === 'function') {
						try {
							onRandomExhibitRequested()
						} catch (err) {
							console.warn('[linkwalk] Random exhibit handler failed', err)
						}
					} else {
						console.info('[linkwalk] Random exhibit requested')
					}
					return
				}

				if (action === 'go-lobby') {
					if (typeof onGoLobbyRequested === 'function') {
						try {
							onGoLobbyRequested()
						} catch (err) {
							console.warn('[linkwalk] Go lobby handler failed', err)
						}
					} else {
						console.info('[linkwalk] Go lobby requested')
					}
					return
				}
				cur = cur.parent
			}
		}

		{
			let cur = hitObj
			while (cur) {
				const pickTarget = cur?.userData?.pickTarget
				if (pickTarget && typeof pickTarget === 'object') {
					holdObject(pickTarget)
					return
				}
				if (cur.userData && cur.userData.pickable) {
					holdObject(cur)
					return
				}
				cur = cur.parent
			}
		}

		const doorId = findDoorId(hitObj)
		if (!doorId) return

		const door = doorById.get(doorId) ?? { id: doorId }

		if (!doorHasTriggerTarget(door)) return

		if (typeof onDoorTrigger === 'function') {
			onDoorTrigger(door)
		} else {
			console.info(`[linkwalk] Door clicked: ${doorId}`)
		}
	}

	window.addEventListener('mousedown', onMouseDown)

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v))
	}

	function updatePlayer(dt) {
		if (!isPointerLocked()) {
			jumpRequested = false
			return
		}

		const inputX = (keysDown.has('KeyD') ? 1 : 0) - (keysDown.has('KeyA') ? 1 : 0)
		const inputZ = (keysDown.has('KeyW') ? 1 : 0) - (keysDown.has('KeyS') ? 1 : 0)

		let moveX = 0
		let moveZ = 0

		if (inputX !== 0 || inputZ !== 0) {
			const len = Math.hypot(inputX, inputZ)
			const nx = inputX / len
			const nz = inputZ / len

			const isSprinting = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')
			const speed = moveSpeed * (isSprinting ? sprintMultiplier : 1)

			const sin = Math.sin(yaw)
			const cos = Math.cos(yaw)
			moveX = (cos * nx + -sin * nz) * speed
			moveZ = (-sin * nx + -cos * nz) * speed
		}

		camera.position.x += moveX * dt
		camera.position.z += moveZ * dt

		let floorY = 0
		const px = camera.position.x
		const pz = camera.position.z
		const playerRadius = 0.35
		const maxStepHeight = 0.5  // Maximum height player can automatically step up

		for (const o of roomObstacles) {
			if (!o || (o.type !== 'box' && o.type !== 'floor')) continue
			const ox = typeof o.x === 'number' ? o.x : 0
			const oy = typeof o.y === 'number' ? o.y : 0
			const oz = typeof o.z === 'number' ? o.z : 0
			const w = typeof o.w === 'number' ? o.w : 0
			const d = typeof o.d === 'number' ? o.d : 0
			if (!(w > 0 && d > 0)) continue


			const hx = w / 2
			const hz = d / 2
			const dx = Math.abs(px - ox)
			const dz = Math.abs(pz - oz)


			const boundsBuffer = o.type === 'floor' ? playerRadius * 0.2 : -playerRadius * 0.3

			if (dx < hx + boundsBuffer && dz < hz + boundsBuffer) {


				const currentEyeLevel = camera.position.y
				const obstacleTopY = oy + eyeHeight

				if (obstacleTopY <= currentEyeLevel + maxStepHeight && oy > floorY) {
					floorY = oy
				}
			}
		}

		const targetFloorY = floorY + eyeHeight

		if (targetFloorY > camera.position.y && targetFloorY <= camera.position.y + maxStepHeight) {
			camera.position.y = targetFloorY
			velocity.y = 0
			grounded = true
		} else {

			velocity.y += gravity * dt
			if (jumpRequested && grounded) {
				velocity.y = jumpSpeed
				grounded = false
			}
			jumpRequested = false

			camera.position.y += velocity.y * dt

			if (camera.position.y <= targetFloorY) {
				camera.position.y = targetFloorY
				velocity.y = 0
				grounded = true
			}
		}

		const margin = 0.35
		const maxX = halfW - margin
		const maxZ = halfL - margin

		{
			const playerRadius = 0.35
			const px = camera.position.x
			const pz = camera.position.z
			let x = px
			let z = pz

			for (const o of roomObstacles) {
				if (!o || o.type !== 'cylinder') continue
				const ox = typeof o.x === 'number' ? o.x : 0
				const oz = typeof o.z === 'number' ? o.z : 0
				const r = typeof o.radius === 'number' ? o.radius : 0
				const minDist = playerRadius + r + 0.05

				const dx = x - ox
				const dz = z - oz
				const dist = Math.hypot(dx, dz)
				if (dist > 0 && dist < minDist) {
					const push = minDist - dist
					x += (dx / dist) * push
					z += (dz / dist) * push
				} else if (dist === 0 && minDist > 0) {
					x += minDist
				}
			}

			for (const o of roomObstacles) {
				if (!o || o.type !== 'box') continue
				const ox = typeof o.x === 'number' ? o.x : 0
				const oz = typeof o.z === 'number' ? o.z : 0
				const w = typeof o.w === 'number' ? o.w : 0
				const d = typeof o.d === 'number' ? o.d : 0
				if (!(w > 0 && d > 0)) continue

				const buffer = playerRadius + 0.05
				const hx = w / 2 + buffer
				const hz = d / 2 + buffer

				const dx = x - ox
				const dz = z - oz

				if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
					const pushX = hx - Math.abs(dx)
					const pushZ = hz - Math.abs(dz)
					if (pushX < pushZ) {
						x += (dx === 0 ? 1 : Math.sign(dx)) * pushX
					} else {
						z += (dz === 0 ? 1 : Math.sign(dz)) * pushZ
					}
				}
			}

			camera.position.x = x
			camera.position.z = z
		}

		camera.position.x = clamp(camera.position.x, -maxX, maxX)
		camera.position.z = clamp(camera.position.z, -maxZ, maxZ)
	}

	let renderWidth = 0
	let renderHeight = 0

	function resize() {
		const width = canvas.clientWidth
		const height = canvas.clientHeight

		if (width <= 0 || height <= 0) return
		if (width === renderWidth && height === renderHeight) return

		renderWidth = width
		renderHeight = height

		renderer.setSize(width, height, false)
		camera.aspect = width / height
		camera.updateProjectionMatrix()
	}

	const clock = new THREE.Clock()
	let rafId = 0
	let lastRenderedAtMs = Number.NEGATIVE_INFINITY
	let fpsFrames = 0
	let fpsTime = 0
	let lastFpsReport = 0
	let lastHeadingReport = 0
	let lastAimCheck = Number.NEGATIVE_INFINITY
	const activeFrameIntervalMs = 1000 / 60
	const restingFrameIntervalMs = 1000 / 20
	const idleFrameIntervalMs = 1000 / 12

	function frame(frameTimeMs) {
		if (document.hidden) {
			// Prevent a large movement delta when a throttled background tab becomes
			// visible again, and do no GPU work while it cannot be seen.
			clock.getDelta()
			lastRenderedAtMs = Number.NEGATIVE_INFINITY
			rafId = window.requestAnimationFrame(frame)
			return
		}

		const pointerLocked = isPointerLocked()
		const hasPlayingVideo = Array.isArray(currentRoom?.videoPlayers)
			&& currentRoom.videoPlayers.some((video) => video && !video.paused && !video.ended)
		const isActive = pointerLocked && (
			keysDown.size > 0
			|| frameTimeMs - lastInteractionAtMs < 300
			|| shotEffects.length > 0
			|| hasPlayingVideo
		)
		const frameIntervalMs = !pointerLocked
			? idleFrameIntervalMs
			: isActive
				? activeFrameIntervalMs
				: restingFrameIntervalMs
		if (Number.isFinite(lastRenderedAtMs)) {
			const elapsedMs = frameTimeMs - lastRenderedAtMs
			if (elapsedMs < frameIntervalMs - 0.5) {
				rafId = window.requestAnimationFrame(frame)
				return
			}
			// Carry the remainder forward so high-refresh displays settle at the
			// requested rate instead of an even divisor such as 55 FPS at 165 Hz.
			lastRenderedAtMs = frameTimeMs - (elapsedMs % frameIntervalMs)
		} else {
			lastRenderedAtMs = frameTimeMs
		}

		const dt = Math.min(clock.getDelta(), 0.1)

		if (typeof onFps === 'function') {
			fpsFrames += 1
			fpsTime += dt
			const now = clock.elapsedTime

			if (fpsTime >= 0.25 && now - lastFpsReport >= 0.25) {
				const fps = fpsFrames / fpsTime
				onFps(fps)
				fpsFrames = 0
				fpsTime = 0
				lastFpsReport = now
			}
		}

		if (typeof onHeading === 'function' && document.pointerLockElement === canvas) {
			const now = clock.elapsedTime
			if (now - lastHeadingReport >= 0.1) {
				onHeading(headingFromYaw(yaw))
				lastHeadingReport = now
			}
		}

		updatePlayer(dt)
		updateWeaponAndShots(dt)

		if (currentRoom && typeof currentRoom.update === 'function') {
			try {
				currentRoom.update(dt, clock.elapsedTime, camera.position)
			} catch (error) {
				console.warn('[linkwalk] Room animation failed', error)
				currentRoom.update = null
			}
		}

		if (clock.elapsedTime - lastAimCheck >= 0.075) {
			setBodyClickableCursor(computeIsAimingAtClickable())
			lastAimCheck = clock.elapsedTime
		}

		resize()
		renderer.render(scene, camera)
		rafId = window.requestAnimationFrame(frame)
	}

	window.addEventListener('resize', resize)
	resize()
	rafId = window.requestAnimationFrame(frame)

	return {
		setInteractionLocked(locked) {
			interactionLocked = Boolean(locked)
		},
		setDoorMeta(doorId, patch = null) {
			const id = typeof doorId === 'string' ? doorId : ''
			if (!id) return
			const door = doorById.get(id)
			if (!door) return
			if (!patch || typeof patch !== 'object') return

			try {
				Object.assign(door, patch)
			} catch {

			}
		},
		setDoorLabelOverride(doorId, text) {
			const id = typeof doorId === 'string' ? doorId : ''
			if (!id) return
			const hit = doorHitById.get(id)
			const ctrl = hit?.userData?.labelControl
			if (!ctrl || typeof ctrl.setOverride !== 'function' || typeof ctrl.clearOverride !== 'function') return

			const t = typeof text === 'string' ? text.trim() : ''
			if (t) ctrl.setOverride(t)
			else ctrl.clearOverride()
		},
		setRoom({
			roomMode: nextMode,
			roomSeedTitle: nextSeedTitle,
			lobbyCategories: nextCategories,
			galleryEntryWall,
			galleryAdjacentCategories: nextAdjacentCategories,
			galleryTitle: nextGalleryTitle,
			galleryDescription: nextGalleryDescription,
			galleryMainThumbnailUrl: nextGalleryMainThumbnailUrl,
			galleryPhotos: nextGalleryPhotos,
			galleryPhotoCaptions: nextGalleryPhotoCaptions,
			galleryBoardSidePhotos: nextGalleryBoardSidePhotos,
			galleryVideoUrl: nextGalleryVideoUrl,
			galleryVideos: nextGalleryVideos,
			galleryTiktoks: nextGalleryTiktoks,
			galleryChefFoodPhotos: nextGalleryChefFoodPhotos,
			galleryHideCaptions: nextGalleryHideCaptions,
			galleryHideInfoBoard: nextGalleryHideInfoBoard,
			galleryHideTrailBoard: nextGalleryHideTrailBoard,
			galleryLongExtract: nextGalleryLongExtract,
			galleryTrail: nextGalleryTrail,
			spawn,
		} = {}) {
			const hasGalleryTitle = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryTitle')
			const hasGalleryDescription = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryDescription')
			const hasGalleryMainThumbnailUrl = Object.prototype.hasOwnProperty.call(
				arguments.length ? arguments[0] ?? {} : {},
				'galleryMainThumbnailUrl'
			)
			const hasGalleryPhotos = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryPhotos')
			const hasGalleryPhotoCaptions = Object.prototype.hasOwnProperty.call(
				arguments.length ? arguments[0] ?? {} : {},
				'galleryPhotoCaptions'
			)
			const hasGalleryBoardSidePhotos = Object.prototype.hasOwnProperty.call(
				arguments.length ? arguments[0] ?? {} : {},
				'galleryBoardSidePhotos'
			)
			const hasGalleryVideoUrl = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryVideoUrl')
			const hasGalleryVideos = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryVideos')
			const hasGalleryTiktoks = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryTiktoks')
			const hasGalleryChefFoodPhotos = Object.prototype.hasOwnProperty.call(
				arguments.length ? arguments[0] ?? {} : {},
				'galleryChefFoodPhotos'
			)
			const hasGalleryHideCaptions = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryHideCaptions')
			const hasGalleryHideInfoBoard = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryHideInfoBoard')
			const hasGalleryHideTrailBoard = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryHideTrailBoard')
			const hasGalleryLongExtract = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryLongExtract')
			const hasGalleryTrail = Object.prototype.hasOwnProperty.call(arguments.length ? arguments[0] ?? {} : {}, 'galleryTrail')

			loadRoom({
				mode: typeof nextMode === 'string' ? nextMode : roomMode,
				seedTitle: typeof nextSeedTitle === 'string' ? nextSeedTitle : roomSeedTitle,
				categories: Array.isArray(nextCategories) ? nextCategories : lobbyCategories,
				galleryEntryWall,
				galleryAdjacentCategories:
					nextAdjacentCategories && typeof nextAdjacentCategories === 'object'
						? nextAdjacentCategories
						: galleryAdjacentCategories,
				galleryTitle: hasGalleryTitle ? (typeof nextGalleryTitle === 'string' ? nextGalleryTitle : null) : galleryTitle,
				galleryDescription: hasGalleryDescription ? (typeof nextGalleryDescription === 'string' ? nextGalleryDescription : null) : galleryDescription,
				galleryMainThumbnailUrl: hasGalleryMainThumbnailUrl
					? typeof nextGalleryMainThumbnailUrl === 'string'
						? nextGalleryMainThumbnailUrl
						: null
					: galleryMainThumbnailUrl,
				galleryPhotos: hasGalleryPhotos ? (Array.isArray(nextGalleryPhotos) ? nextGalleryPhotos : null) : galleryPhotos,
				galleryPhotoCaptions: hasGalleryPhotoCaptions
					? Array.isArray(nextGalleryPhotoCaptions)
						? nextGalleryPhotoCaptions
						: null
					: galleryPhotoCaptions,
				galleryBoardSidePhotos: hasGalleryBoardSidePhotos
					? Array.isArray(nextGalleryBoardSidePhotos)
						? nextGalleryBoardSidePhotos
						: null
					: galleryBoardSidePhotos,
				galleryVideoUrl: hasGalleryVideoUrl ? (typeof nextGalleryVideoUrl === 'string' ? nextGalleryVideoUrl : null) : galleryVideoUrl,
				galleryVideos: hasGalleryVideos ? (Array.isArray(nextGalleryVideos) ? nextGalleryVideos : []) : galleryVideos,
				galleryTiktoks: hasGalleryTiktoks ? (Array.isArray(nextGalleryTiktoks) ? nextGalleryTiktoks : []) : galleryTiktoks,
				galleryChefFoodPhotos: hasGalleryChefFoodPhotos
					? (Array.isArray(nextGalleryChefFoodPhotos) ? nextGalleryChefFoodPhotos : [])
					: galleryChefFoodPhotos,
				galleryHideCaptions: hasGalleryHideCaptions ? nextGalleryHideCaptions === true : galleryHideCaptions === true,
				galleryHideInfoBoard: hasGalleryHideInfoBoard ? nextGalleryHideInfoBoard === true : galleryHideInfoBoard === true,
				galleryHideTrailBoard: hasGalleryHideTrailBoard ? nextGalleryHideTrailBoard === true : galleryHideTrailBoard === true,
				galleryLongExtract: hasGalleryLongExtract ? (typeof nextGalleryLongExtract === 'string' ? nextGalleryLongExtract : null) : galleryLongExtract,
				galleryTrail: hasGalleryTrail ? (Array.isArray(nextGalleryTrail) ? nextGalleryTrail : null) : null,
				spawn,
			})
		},
		stop() {
			if (held) releaseHeld()
			clearShotEffects()

			window.cancelAnimationFrame(rafId)
			window.removeEventListener('resize', resize)

			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mousedown', onMouseDown)
			document.removeEventListener('pointerlockchange', handlePointerLockChange)

			if (flashlightTimeoutId) window.clearTimeout(flashlightTimeoutId)
			if (firingClassTimeoutId) window.clearTimeout(firingClassTimeoutId)
			if (hitConfirmTimeoutId) window.clearTimeout(hitConfirmTimeoutId)
			document.body.classList.remove('weapon-firing')
			document.body.classList.remove('shot-confirmed')
			if (shotAudioContext && typeof shotAudioContext.close === 'function') {
				void shotAudioContext.close()
				shotAudioContext = null
			}
			if (currentRoom) {
				scene.remove(currentRoom.group)
				disposeMany(currentRoom.disposables)
				currentRoom = null
			}

			disposeMany(staticDisposables)
			renderer.dispose()
		},
	}
}
