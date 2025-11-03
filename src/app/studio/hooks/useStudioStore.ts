import { create } from 'zustand';

export interface SceneObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
}

interface StudioStore {
  objects: SceneObject[];
  selectedObject: string | null;
  transformMode: 'select' | 'translate' | 'rotate' | 'scale';
  addObject: (type: SceneObject['type']) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  clearScene: () => void;
  setTransformMode: (mode: 'select' | 'translate' | 'rotate' | 'scale') => void;
}

export const useStudioStore = create<StudioStore>((set) => ({
  objects: [],
  selectedObject: null,
  transformMode: 'select',

  addObject: (type) => {
    const newObject: SceneObject = {
      id: `${type}-${Date.now()}`,
      type,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#D4AF37',
    };
    set((state) => ({
      objects: [...state.objects, newObject],
      selectedObject: newObject.id,
    }));
  },

  updateObject: (id, updates) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
    }));
  },

  deleteObject: (id) => {
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObject: state.selectedObject === id ? null : state.selectedObject,
    }));
  },

  clearScene: () => {
    set({ objects: [], selectedObject: null });
  },

  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },
}));
