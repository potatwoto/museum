import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const assetPromises = new Map()

const DECOR_ASSETS = {
	sconce: 'models/decor/industrial_wall_sconce/industrial_wall_sconce_1k.gltf',
}

function assetUrl(relativePath) {
	const base = import.meta.env.BASE_URL || '/'
	return `${base.endsWith('/') ? base : `${base}/`}${relativePath}`
}

function loadDecorAsset(key) {
	if (!assetPromises.has(key)) {
		const url = assetUrl(DECOR_ASSETS[key])
		assetPromises.set(key, loader.loadAsync(url).then((gltf) => gltf.scene))
	}
	return assetPromises.get(key)
}

function cloneMaterials(root, disposables, configureMaterial) {
	root.traverse((object) => {
		if (!object.isMesh || !object.material) return

		const sourceMaterials = Array.isArray(object.material)
			? object.material
			: [object.material]
		const clonedMaterials = sourceMaterials.map((source) => {
			const material = source.clone()
			configureMaterial?.(material)
			disposables.push(material)
			return material
		})

		object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0]
	})
}

function addGallerySconces({ root, disposables, width, length, height, wallThickness, isActive }) {
	const innerSouthZ = length / 2 - wallThickness / 2
	// Keep the west lamp well clear of the exit-sign station beside the door.
	const xOffset = Math.min(3.5, Math.max(3.1, width * 0.23))
	const mountY = height - 0.72

	for (const x of [-xOffset, xOffset]) {
		const light = new THREE.PointLight(0xffc989, 1.8, 3.6, 2)
		light.name = 'gallery-sconce-light'
		light.position.set(x, mountY, innerSouthZ - 0.38)
		root.add(light)
	}

	void loadDecorAsset('sconce')
		.then((source) => {
			if (!isActive()) return

			for (const x of [-xOffset, xOffset]) {
				const sconce = source.clone(true)
				sconce.name = 'gallery-wall-sconce'
				sconce.scale.setScalar(1.3)
				sconce.position.set(x, mountY, innerSouthZ - 0.025)
				sconce.rotation.y = Math.PI
				cloneMaterials(sconce, disposables, (material) => {
					if (!material.name.includes('_bulb')) return
					material.emissive = new THREE.Color(0xffc27d)
					material.emissiveIntensity = 1.35
				})
				root.add(sconce)
			}
		})
		.catch((error) => console.warn('Unable to load gallery sconces', error))
}

export function addMuseumDecorations({
	group,
	disposables,
	width,
	length,
	height,
	wallThickness,
}) {
	const root = new THREE.Group()
	root.name = 'museum-decorations'
	group.add(root)

	let active = true
	disposables.push({
		dispose() {
			active = false
		}
	})
	const isActive = () => active

	addGallerySconces({
		root,
		disposables,
		width,
		length,
		height,
		wallThickness,
		isActive,
	})

	return root
}
