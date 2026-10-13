"""Import an actual Hew GLB into Blender and produce an offline Cycles image."""
from __future__ import annotations
from pathlib import Path
import sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) != 2:
    raise SystemExit("Usage: blender -b --python render_blender.py -- input.glb output.png")
source, target = map(Path, args)
assert source.is_file(), f"GLB not found: {source}"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
meshes = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
assert meshes, "No meshes after GLB import"
vertices = [ob.matrix_world @ Vector(v) for ob in meshes for v in ob.bound_box]
lo = Vector(tuple(min(p[i] for p in vertices) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in vertices) for i in range(3)))
center = (lo + hi) * 0.5
size = max((hi - lo).length, 1.0)
camera_data = bpy.data.cameras.new("NEXO test camera")
camera = bpy.data.objects.new("NEXO test camera", camera_data)
bpy.context.scene.collection.objects.link(camera)
camera.location = center + Vector((size*1.2, -size*1.45, size*0.95))
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 40
bpy.context.scene.camera = camera
light_data = bpy.data.lights.new("NEXO softbox", type="AREA")
light = bpy.data.objects.new("NEXO softbox", light_data)
bpy.context.scene.collection.objects.link(light)
light.location = center + Vector((size*0.2, -size*0.4, size*1.5))
light_data.energy = 900
light_data.shape = "DISK"
light_data.size = size * 1.4
light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
world = bpy.data.worlds.new("NEXO neutral environment")
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.43,0.50,0.58,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .7
scene = bpy.context.scene
scene.world = world
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.render.resolution_x = 512
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(target.resolve())
bpy.ops.render.render(write_still=True)
print("RESULT: Blender imported", len(meshes), "mesh objects from Hew")
print("RESULT: Dimensions (m):",tuple(round(float(x),3) for x in hi-lo))
print("RESULT: PNG:",target)
