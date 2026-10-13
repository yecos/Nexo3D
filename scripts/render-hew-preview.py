# SPDX-License-Identifier: AGPL-3.0-only
# Local Blender process invoked by NEXO. No network, assets or Blender source embedded.
from pathlib import Path
import sys
import bpy
from mathutils import Vector

arguments=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
if len(arguments)!=2:
    raise SystemExit("Usage: blender -b --python render-hew-preview.py -- input.glb output.png")
source,destination=map(lambda p:Path(p).resolve(),arguments)
if not source.is_file(): raise SystemExit("GLB does not exist")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[obj for obj in bpy.context.scene.objects if obj.type=="MESH"]
if not meshes: raise SystemExit("Blender did not import any mesh from Hew GLB")
corners=[obj.matrix_world @ Vector(v) for obj in meshes for v in obj.bound_box]
lower=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
upper=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
center=(lower+upper)*0.5
size=max((upper-lower).length,1.0)
cameraData=bpy.data.cameras.new("NEXO Camera")
camera=bpy.data.objects.new("NEXO Camera",cameraData)
bpy.context.collection.objects.link(camera)
camera.location=center+Vector((size*1.2,-size*1.45,size*0.95))
camera.rotation_euler=(center-camera.location).to_track_quat("-Z","Y").to_euler()
cameraData.lens=40
bpy.context.scene.camera=camera
lightData=bpy.data.lights.new("NEXO Softbox",type="AREA")
light=bpy.data.objects.new("NEXO Softbox",lightData)
bpy.context.collection.objects.link(light)
light.location=center+Vector((size*0.2,-size*0.4,size*1.5))
light.rotation_euler=(center-light.location).to_track_quat("-Z","Y").to_euler()
lightData.energy=950
lightData.size=size*1.4
world=bpy.data.worlds.new("NEXO Ambient")
world.use_nodes=True
world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.5,.55,.60,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.7
scene=bpy.context.scene
scene.world=world
scene.render.engine="CYCLES"
scene.cycles.samples=12
for layer in scene.view_layers:
    if hasattr(layer,"cycles"):layer.cycles.use_denoising=False
if hasattr(scene.cycles,"use_denoising"):scene.cycles.use_denoising=False
scene.render.resolution_x=640
scene.render.resolution_y=400
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(destination)
bpy.ops.render.render(write_still=True)
if not destination.is_file():raise SystemExit("Cycles failed to write PNG")
print("NEXO PASS:",len(meshes),"meshes;",destination.stat().st_size,"bytes")
