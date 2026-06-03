import { MapObjType } from "@/types/map";
import type { ZoneType, ZoneTypeMeta } from "@/types/zone";
import {
  IconCameraSearch,
  IconInputSpark,
  IconRipple,
  IconShieldCheck,
  IconVolume,
} from "@tabler/icons-react";

export const ZONE_TYPE_META: Record<ZoneType, ZoneTypeMeta> = {
  [MapObjType.CollisionZone]: {
    slug: "collision",
    color: 0xff3333,
    cssColor: "#ff3333",
    label: "zoneTypeCollision",
    icon: <IconShieldCheck size={14} />,
  },
  [MapObjType.SinkZone]: {
    slug: "sink",
    color: 0x4488ff,
    cssColor: "#4488ff",
    label: "zoneTypeSink",
    icon: <IconRipple size={14} />,
  },
  [MapObjType.SoundZone]: {
    slug: "sound",
    color: 0xff9900,
    cssColor: "#ff9900",
    label: "zoneTypeSound",
    icon: <IconVolume size={14} />,
  },
  [MapObjType.CameraZone]: {
    slug: "zoom",
    color: 0xaa44ff,
    cssColor: "#aa44ff",
    label: "cameraTypeZone",
    icon: <IconCameraSearch size={14} />,
  },
  [MapObjType.SensorZone]: {
    slug: "sensor",
    color: 0x44ffaa,
    cssColor: "#44ffaa",
    label: "zoneTypeSensor",
    icon: <IconInputSpark size={14} />,
  },
};
