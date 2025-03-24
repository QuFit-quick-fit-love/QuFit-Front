import { Gender } from '@apis/types/entity';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { Room } from 'livekit-client';
import { Participant } from 'livekit-client';
import { create } from 'zustand';

export interface RoomParticipant {
    id: number | undefined;
    gender: Gender | undefined;
    nickname: string | undefined;
    info: Participant | undefined;
    faceLandmarkerReady: boolean; // 추가
    faceLandmarker: FaceLandmarker | null; // 방 참가자별로 FaceLandmarker 인스턴스 가지고 있도록 해야했음.
}

type State = {
    room: Room | undefined;
    participants: RoomParticipant[];
    hostId: number | undefined;
    roomId: number | undefined;
    roomMax: number | undefined;
};

type Action = {
    setRoom: (room: Room | undefined) => void;
    setParticipants: (participant: RoomParticipant[] | undefined) => void;
    setHostId: (id: number) => void;
    setRoomId: (id: number) => void;
    setRoomMax: (roomMax: number) => void;
};

const useRoomStore = create<State & Action>((set) => ({
    roomMax: undefined,
    room: undefined,
    participants: [],
    hostId: undefined,
    roomId: undefined,

    setRoomMax: (roomMax) => set({ roomMax: roomMax }),
    setRoom: (room) => set({ room: room }),
    setParticipants: (participants) => set({ participants: participants }),
    setHostId: (hostId) => set({ hostId: hostId }),
    setRoomId: (roomId) => set({ roomId: roomId }),
}));

export const useRoomStateStore = () => useRoomStore((state) => state.room);
export const useRoomParticipantsStore = () => useRoomStore((state) => state.participants);
export const useHostIdStore = () => useRoomStore((state) => state.hostId);
export const useRoomIdStore = () => useRoomStore((state) => state.roomId);
export const useRoomMaxStore = () => useRoomStore((state) => state.roomMax);

export const useSetRoomStateStore = () => useRoomStore((state) => state.setRoom);
export const useRoomSetParticipantsStore = () => useRoomStore((state) => state.setParticipants);
export const useSetHostIdStore = () => useRoomStore((state) => state.setHostId);
export const useSetRoomIdStore = () => useRoomStore((state) => state.setRoomId);
export const useSetRoomMaxStore = () => useRoomStore((state) => state.setRoomMax);
