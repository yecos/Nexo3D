# SPDX-License-Identifier: AGPL-3.0-only
"""Exporta el JSON canónico NEXO BIM a un modelo IFC4 real con IfcOpenShell.

Uso: python ifc/export_ifc.py proyecto.json salida.ifc
El exportador NO interpreta archivos IFC externos ni produce planos legales.
"""
from __future__ import annotations

import json
import math
import sys
import uuid
from pathlib import Path

import numpy as np
import ifcopenshell
import ifcopenshell.api.aggregate
import ifcopenshell.api.context
import ifcopenshell.api.feature
import ifcopenshell.api.geometry
import ifcopenshell.api.project
import ifcopenshell.api.pset
import ifcopenshell.api.root
import ifcopenshell.api.spatial
import ifcopenshell.api.unit
import ifcopenshell.guid


def require(valid: bool, message: str) -> None:
    if not valid:
        raise ValueError(message)


def finite(value, lo, hi) -> bool:
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value) and lo <= value <= hi


def validate(data: dict) -> dict:
    require(isinstance(data, dict) and data.get("schemaVersion") == 1, "Versión de proyecto inválida.")
    name = data.get("name")
    require(isinstance(name, str) and 0 < len(name) <= 120, "Nombre inválido.")
    levels = data.get("levels")
    walls = data.get("walls")
    require(isinstance(levels, list) and 1 <= len(levels) <= 30, "Niveles inválidos.")
    require(isinstance(walls, list) and len(walls) <= 1500, "Número de muros inválido.")
    ids = set()
    levels_by_id = {}
    for level in levels:
        require(isinstance(level, dict), "Nivel inválido.")
        ident = level.get("id")
        require(isinstance(ident, str) and 0 < len(ident) <= 120 and ident not in ids, "ID de nivel inválido.")
        require(isinstance(level.get("name"), str) and len(level["name"]) <= 80, "Nombre de nivel inválido.")
        require(finite(level.get("elevation"), -3000, 3000) and finite(level.get("height"), 1.8, 20), "Altura del nivel inválida.")
        ids.add(ident)
        levels_by_id[ident] = level
    for wall in walls:
        require(isinstance(wall, dict), "Muro inválido.")
        ident = wall.get("id")
        require(isinstance(ident, str) and 0 < len(ident) <= 120 and ident not in ids, "ID de muro inválido.")
        require(wall.get("levelId") in levels_by_id, "Nivel de muro desconocido.")
        a, b = wall.get("a"), wall.get("b")
        require(all(isinstance(p, list) and len(p) == 2 and all(finite(v, -10000, 10000) for v in p) for p in [a, b]), "Coordenadas del muro inválidas.")
        length = math.dist(a, b)
        require(0.25 <= length <= 1000 and finite(wall.get("height"), .2, 20) and finite(wall.get("thickness"), .05, 1), "Dimensiones del muro inválidas.")
        openings = wall.get("openings")
        require(isinstance(openings, list) and len(openings) <= 40, "Vanos inválidos.")
        spans = []
        for opening in openings:
            require(isinstance(opening, dict), "Vano inválido.")
            oid = opening.get("id")
            require(isinstance(oid, str) and 0 < len(oid) <= 120 and oid not in ids, "ID de vano inválido.")
            require(opening.get("kind") in ("door", "window"), "Tipo de vano inválido.")
            require(all(finite(opening.get(k), 0, 1000) for k in ("offset", "width", "height", "sill")), "Dimensiones del vano inválidas.")
            offset, width = opening["offset"], opening["width"]
            require(width >= .3 and opening["height"] >= .3 and opening["sill"] + opening["height"] <= wall["height"] + 1e-6, "Altura de vano inválida.")
            require(offset-width/2 >= .049 and offset+width/2 <= length-.049, "Vano fuera del muro.")
            spans.append((offset-width/2, offset+width/2))
            ids.add(oid)
        spans.sort()
        require(all(spans[i][0]-spans[i-1][1] >= .049 for i in range(1, len(spans))), "Vanos superpuestos.")
        ids.add(ident)
    return data


def guid_for(ident: str) -> str:
    """El GlobalId IFC permanece estable entre exportaciones del mismo objeto."""
    return ifcopenshell.guid.compress(uuid.uuid5(uuid.NAMESPACE_URL, "nexo-bim://"+ident).hex)


def placement(x: float, y: float, z: float, angle: float) -> np.ndarray:
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, -s, 0, x],
                     [s,  c, 0, y],
                     [0,  0, 1, z],
                     [0,  0, 0, 1]], dtype=float)


def pset(model, product, name: str, properties: dict) -> None:
    definition = ifcopenshell.api.pset.add_pset(model, product=product, name=name)
    ifcopenshell.api.pset.edit_pset(model, pset=definition, properties=properties)


def convert(data: dict):
    validate(data)
    model = ifcopenshell.api.project.create_file(version="IFC4")
    project = ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name=data["name"])
    project.GlobalId = guid_for("project:"+data["name"])
    length_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="LENGTHUNIT")
    area_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="AREAUNIT")
    volume_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="VOLUMEUNIT")
    ifcopenshell.api.unit.assign_unit(model, units=[length_unit, area_unit, volume_unit])
    context = ifcopenshell.api.context.add_context(model, context_type="Model")
    body = ifcopenshell.api.context.add_context(
        model, context_type="Model", context_identifier="Body",
        target_view="MODEL_VIEW", parent=context)
    site = ifcopenshell.api.root.create_entity(model, ifc_class="IfcSite", name="Terreno")
    building = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuilding", name="Edificio")
    ifcopenshell.api.aggregate.assign_object(model, products=[site], relating_object=project)
    ifcopenshell.api.aggregate.assign_object(model, products=[building], relating_object=site)
    storeys = {}
    for level in data["levels"]:
        storey = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuildingStorey", name=level["name"])
        storey.GlobalId = guid_for(level["id"])
        storey.Tag = level["id"]
        storey.Elevation = level["elevation"]
        ifcopenshell.api.aggregate.assign_object(model, products=[storey], relating_object=building)
        ifcopenshell.api.geometry.edit_object_placement(model, product=storey,
            matrix=placement(0, 0, level["elevation"], 0))
        storeys[level["id"]] = storey
    for wall_data in data["walls"]:
        a, b = wall_data["a"], wall_data["b"]
        length = math.dist(a, b)
        angle = math.atan2(b[1]-a[1], b[0]-a[0])
        level = next(l for l in data["levels"] if l["id"] == wall_data["levelId"])
        wall = ifcopenshell.api.root.create_entity(model, ifc_class="IfcWall", name="Muro")
        wall.GlobalId = guid_for(wall_data["id"])
        wall.Tag = wall_data["id"]
        ifcopenshell.api.geometry.create_2pt_wall(model,
            element=wall, context=body, p1=tuple(a), p2=tuple(b),
            elevation=level["elevation"], height=wall_data["height"],
            thickness=wall_data["thickness"], is_si=True)
        ifcopenshell.api.spatial.assign_container(model, products=[wall],
            relating_structure=storeys[wall_data["levelId"]])
        pset(model, wall, "NexoBIM_Wall", {
            "NexoId":wall_data["id"], "LevelId":wall_data["levelId"],
            "StartX":a[0], "StartY":a[1], "EndX":b[0], "EndY":b[1],
            "Thickness":wall_data["thickness"], "WallHeight":wall_data["height"]})
        gross = length*wall_data["thickness"]*wall_data["height"]
        net = gross - sum(o["width"]*o["height"]*wall_data["thickness"] for o in wall_data["openings"])
        qto = ifcopenshell.api.pset.add_qto(model, product=wall, name="Qto_WallBaseQuantities")
        ifcopenshell.api.pset.edit_qto(model, qto=qto, properties={
            "Length":length, "Width":wall_data["thickness"], "Height":wall_data["height"],
            "GrossVolume":gross, "NetVolume":net})
        ux, uy = (b[0]-a[0])/length, (b[1]-a[1])/length
        nx, ny = -uy, ux
        for o in wall_data["openings"]:
            # Si el hueco se extiende 0,05 m por cada lado, la sustracción es robusta.
            opening = ifcopenshell.api.root.create_entity(model, ifc_class="IfcOpeningElement", name="Hueco")
            opening.GlobalId = guid_for("opening:"+o["id"])
            opening_rep = ifcopenshell.api.geometry.add_wall_representation(
                model, context=body, length=o["width"], height=o["height"],
                thickness=wall_data["thickness"]+.10)
            ifcopenshell.api.geometry.assign_representation(model, product=opening,
                representation=opening_rep)
            start = o["offset"]-o["width"]/2
            cx = a[0]+ux*start-nx*.05
            cy = a[1]+uy*start-ny*.05
            z = level["elevation"]+o["sill"]
            ifcopenshell.api.geometry.edit_object_placement(model, product=opening,
                matrix=placement(cx, cy, z, angle))
            ifcopenshell.api.feature.add_feature(model, feature=opening, element=wall)
            klass = "IfcDoor" if o["kind"]=="door" else "IfcWindow"
            filling = ifcopenshell.api.root.create_entity(model, ifc_class=klass, name=klass[3:])
            filling.GlobalId = guid_for(o["id"])
            filling.Tag = o["id"]
            rep = ifcopenshell.api.geometry.add_wall_representation(
                model, context=body, length=o["width"], height=o["height"], thickness=.04)
            ifcopenshell.api.geometry.assign_representation(model, product=filling,
                representation=rep)
            # Centrar visualmente la hoja o el acristalamiento en el espesor del muro.
            fy = a[1]+uy*start+ny*(wall_data["thickness"]-.04)/2
            fx = a[0]+ux*start+nx*(wall_data["thickness"]-.04)/2
            ifcopenshell.api.geometry.edit_object_placement(model, product=filling,
                matrix=placement(fx, fy, z, angle))
            ifcopenshell.api.feature.add_filling(model, opening=opening, element=filling)
            ifcopenshell.api.spatial.assign_container(model, products=[filling],
                relating_structure=storeys[wall_data["levelId"]])
            if o["kind"] == "door":
                filling.OverallHeight = o["height"]
                filling.OverallWidth = o["width"]
            else:
                filling.OverallHeight = o["height"]
                filling.OverallWidth = o["width"]
            pset(model, filling, "NexoBIM_Opening", {
                "NexoId":o["id"], "Kind":o["kind"], "CenterOffset":o["offset"],
                "SillHeight":o["sill"], "Width":o["width"], "Height":o["height"]})
    return model


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Uso: python export_ifc.py entrada.json salida.ifc", file=sys.stderr)
        return 2
    source, destination = map(Path, argv[1:])
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
        model = convert(data)
        model.write(str(destination))
        # Verificar al menos una lectura de la salida creada.
        reopened = ifcopenshell.open(str(destination))
        if reopened.schema != "IFC4" or len(reopened.by_type("IfcWall")) != len(data["walls"]):
            raise ValueError("La exportación no superó la verificación IFC4.")
        return 0
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print("Error del proyecto IFC: "+str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
