import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import catModelUrl from '../../assets/models/toon_cat_free.glb?url'
import catMeowUrl from '../../assets/audio/cat-meow.ogg?url'

let catAssetPromise = null

const COAT_STYLES = [
	{ name: 'ginger', filter: 'none', size: 1, speed: 1 },
	{ name: 'cream', filter: 'sepia(0.25) saturate(0.6) brightness(1.2)', size: 0.94, speed: 0.96 },
	{ name: 'silver', filter: 'grayscale(1) brightness(1.18) contrast(0.9)', size: 0.9, speed: 1.08 },
	{ name: 'charcoal', filter: 'grayscale(1) brightness(0.52) contrast(1.2)', size: 1.04, speed: 0.9 },
	{ name: 'brown', filter: 'sepia(0.8) saturate(0.72) brightness(0.68)', size: 1.08, speed: 0.86 },
]

function loadCatAsset() {
	if (!catAssetPromise) {
		catAssetPromise = new GLTFLoader().loadAsync(catModelUrl).then((gltf) => {
			gltf.scene.updateMatrixWorld(true)
			const bounds = new THREE.Box3().setFromObject(gltf.scene)
			const size = bounds.getSize(new THREE.Vector3())
			return {
				animations: gltf.animations,
				scene: gltf.scene,
				scale: size.y > 0 ? 0.72 / size.y : 1,
			}
		})
	}
	return catAssetPromise
}

function turnToward(current, target, amount) {
	let delta = (target - current + Math.PI) % (Math.PI * 2) - Math.PI
	if (delta < -Math.PI) delta += Math.PI * 2
	return current + delta * Math.min(1, amount)
}

function shuffledCoatStyles() {
	const styles = [...COAT_STYLES]
	for (let i = styles.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const swap = styles[i]
		styles[i] = styles[j]
		styles[j] = swap
	}
	return styles
}

function makeCoatTexture(sourceTexture, filter) {
	const image = sourceTexture?.image
	const width = image?.naturalWidth || image?.videoWidth || image?.width || 0
	const height = image?.naturalHeight || image?.videoHeight || image?.height || 0
	if (!image || width <= 0 || height <= 0) return null

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d')
	if (!context) return null

	context.filter = filter
	context.drawImage(image, 0, 0, width, height)

	const texture = new THREE.CanvasTexture(canvas)
	texture.colorSpace = sourceTexture.colorSpace
	texture.flipY = sourceTexture.flipY
	texture.wrapS = sourceTexture.wrapS
	texture.wrapT = sourceTexture.wrapT
	texture.magFilter = sourceTexture.magFilter
	texture.minFilter = sourceTexture.minFilter
	texture.repeat.copy(sourceTexture.repeat)
	texture.offset.copy(sourceTexture.offset)
	texture.center.copy(sourceTexture.center)
	texture.rotation = sourceTexture.rotation
	texture.needsUpdate = true
	return texture
}

export function addMuseumCats({ group, disposables, pickableMeshes, obstacles, width, length, mode }) {
	const catRoot = new THREE.Group()
	catRoot.name = 'museum-cats'
	group.add(catRoot)

	const cats = []
	const meowVoices = Array.from({ length: 3 }, () => {
		const audio = new Audio(catMeowUrl)
		audio.preload = 'auto'
		audio.volume = 1
		return audio
	})
	let nextMeowVoice = 0
	let active = true
	const halfW = width / 2
	const halfL = length / 2
	const xLimit = mode === 'lobby' ? Math.max(2.5, halfW - 5) : Math.max(2.5, halfW - 1.15)
	const zLimit = Math.max(2.5, halfL - 1.45)

	disposables.push({
		dispose() {
			active = false
			for (const cat of cats) cat.mixer.stopAllAction()
			for (const voice of meowVoices) {
				voice.pause()
				voice.removeAttribute('src')
				voice.load()
			}
			cats.length = 0
		},
	})

	function playMeow() {
		const voice = meowVoices[nextMeowVoice]
		nextMeowVoice = (nextMeowVoice + 1) % meowVoices.length
		voice.pause()
		voice.currentTime = 0
		voice.volume = 1
		void voice.play().catch(() => {})
	}

	function isBlocked(x, z) {
		for (const obstacle of obstacles) {
			if (!obstacle) continue
			const ox = typeof obstacle.x === 'number' ? obstacle.x : 0
			const oz = typeof obstacle.z === 'number' ? obstacle.z : 0

			if (obstacle.type === 'floor') {
				// The lobby stairs and side platforms are elevated floor surfaces.
				// They are walkable for the player but must remain solid to cats.
				const elevation = typeof obstacle.y === 'number' ? obstacle.y : 0
				if (elevation <= 0.05) continue
				const floorHalfW = (typeof obstacle.w === 'number' ? obstacle.w : 0) / 2 + 0.48
				const floorHalfD = (typeof obstacle.d === 'number' ? obstacle.d : 0) / 2 + 0.48
				if (Math.abs(x - ox) < floorHalfW && Math.abs(z - oz) < floorHalfD) return true
				continue
			}

			if (obstacle.type === 'cylinder') {
				const radius = (typeof obstacle.radius === 'number' ? obstacle.radius : 0) + 0.48
				if (Math.hypot(x - ox, z - oz) < radius) return true
				continue
			}

			if (obstacle.type === 'box') {
				const obstacleHalfW = (typeof obstacle.w === 'number' ? obstacle.w : 0) / 2 + 0.42
				const obstacleHalfD = (typeof obstacle.d === 'number' ? obstacle.d : 0) / 2 + 0.42
				if (Math.abs(x - ox) < obstacleHalfW && Math.abs(z - oz) < obstacleHalfD) return true
			}
		}
		return false
	}

	function randomWaypoint(fallback = null) {
		for (let attempt = 0; attempt < 32; attempt += 1) {
			const x = (Math.random() * 2 - 1) * xLimit
			const z = (Math.random() * 2 - 1) * zLimit
			if (!isBlocked(x, z)) return new THREE.Vector3(x, 0, z)
		}
		return fallback?.clone?.() || new THREE.Vector3(0, 0, zLimit * 0.55)
	}

	function createCat(asset, index, coatStyle) {
		const root = new THREE.Group()
		root.name = `museum-cat-${index + 1}`
		root.position.copy(randomWaypoint(new THREE.Vector3((index - 1) * 1.5, 0, zLimit * 0.42)))
		catRoot.add(root)

		const model = cloneSkeleton(asset.scene)
		model.name = 'toon-cat-model'
		model.userData.coat = coatStyle.name

		const materialClones = new Map()
		const textureClones = new Map()
		model.traverse((object) => {
			if (!object.isMesh && !object.isSkinnedMesh) return
			const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
			const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
				if (!sourceMaterial) return sourceMaterial
				if (materialClones.has(sourceMaterial)) return materialClones.get(sourceMaterial)

				const material = sourceMaterial.clone()
				if (sourceMaterial.map) {
					let texture = textureClones.get(sourceMaterial.map)
					if (!texture) {
						texture = makeCoatTexture(sourceMaterial.map, coatStyle.filter)
						if (texture) {
							textureClones.set(sourceMaterial.map, texture)
							disposables.push(texture)
						}
					}
					if (texture) material.map = texture
				}
				material.color.set(0xffffff)
				material.needsUpdate = true
				materialClones.set(sourceMaterial, material)
				disposables.push(material)
				return material
			})
			object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0]
		})

		model.scale.setScalar(asset.scale * coatStyle.size * (0.97 + Math.random() * 0.06))
		model.updateMatrixWorld(true)

		const bounds = new THREE.Box3().setFromObject(model)
		const center = bounds.getCenter(new THREE.Vector3())
		model.position.set(-center.x, -bounds.min.y, -center.z)
		root.add(model)

		const mixer = new THREE.AnimationMixer(model)
		const clip = asset.animations[0] ?? null
		const action = clip ? mixer.clipAction(clip) : null
		if (action) {
			action.setLoop(THREE.LoopRepeat, Infinity)
			action.play()
			action.time = Math.random() * Math.max(0.01, clip.duration)
		}

		const target = randomWaypoint(root.position)
		root.rotation.y = Math.atan2(target.x - root.position.x, target.z - root.position.z)

		const cat = {
			root,
			model,
			mixer,
			action,
			target,
			retargetTime: 5 + Math.random() * 8,
			speed: (0.42 + Math.random() * 0.18) * coatStyle.speed,
		}

		function hitCat() {
			playMeow()
		}

		model.traverse((object) => {
			if (!object.isMesh && !object.isSkinnedMesh) return
			object.castShadow = true
			object.userData.onClick = hitCat
			object.userData.pickableType = 'museum-cat'
			pickableMeshes.push(object)
		})

		return cat
	}

	const catCount = 2 + (Math.random() < 0.45 ? 1 : 0)
	const coatStyles = shuffledCoatStyles()
	void loadCatAsset()
		.then((asset) => {
			if (!active) return
			for (let index = 0; index < catCount; index += 1) {
				cats.push(createCat(asset, index, coatStyles[index]))
			}
		})
		.catch((error) => {
			console.warn('[linkwalk] Cat model failed to load', error)
		})

	const direction = new THREE.Vector3()

	function updateCat(cat, dt) {
		cat.retargetTime -= dt
		direction.subVectors(cat.target, cat.root.position)
		direction.y = 0
		const distance = direction.length()

		if (distance < 0.25 || cat.retargetTime <= 0) {
			cat.target.copy(randomWaypoint(cat.root.position))
			cat.retargetTime = 5 + Math.random() * 8
		} else {
			direction.multiplyScalar(1 / distance)
			const step = Math.min(distance, cat.speed * dt)
			const targetYaw = Math.atan2(direction.x, direction.z)
			cat.root.rotation.y = turnToward(cat.root.rotation.y, targetYaw, dt * 4.5)
			// Move along the cat's facing direction so turns form a natural arc
			// instead of the model sliding sideways toward a new waypoint.
			const nextX = cat.root.position.x + Math.sin(cat.root.rotation.y) * step
			const nextZ = cat.root.position.z + Math.cos(cat.root.rotation.y) * step
			if (isBlocked(nextX, nextZ)) {
				cat.target.copy(randomWaypoint(cat.root.position))
				cat.retargetTime = 5 + Math.random() * 8
			} else {
				cat.root.position.x = nextX
				cat.root.position.z = nextZ
			}
		}

		if (cat.action) cat.mixer.update(dt * (cat.speed / 0.52))
	}

	function update(dt) {
		for (const cat of cats) {
			updateCat(cat, dt)
		}
	}

	return { update, cats }
}
