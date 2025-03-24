import { getVideoDetail, postVideo, postVideoJoin } from '@apis/video/VideoApi';
import { LIVEKIT_URL, ROOM_SETTING } from '@components/video/VideoConstants';
import useMember from '@hooks/useMember';
import { useLeaveVideoRoomMutation } from '@queries/useVideoQuery';
import { VideoRoomRequest } from '@apis/types/request';
import {
    RoomParticipant,
    useHostIdStore,
    useRoomParticipantsStore,
    useRoomSetParticipantsStore,
    useRoomStateStore,
    useSetHostIdStore,
    useSetRoomStateStore,
} from '@stores/video/roomStore';
import { createLocalVideoTrack, Participant, Room, RoomEvent } from 'livekit-client';
import { useNavigate } from 'react-router-dom';
import { PATH } from '@routers/PathConstants';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const useRoom = () => {
    const setRoom = useSetRoomStateStore();
    const room = useRoomStateStore();
    const { member } = useMember();
    const navigate = useNavigate();
    const setParticipants = useRoomSetParticipantsStore();
    const setHostId = useSetHostIdStore();
    const hostId = useHostIdStore();
    const leaveVideoRoom = useLeaveVideoRoomMutation();
    const isHost = member?.memberId === hostId;

    const participants = useRoomParticipantsStore();
    const updateParticipants = async (room: Room, roomId: number) => {
        try {
            const response = await getVideoDetail(roomId);
            const members = response.data.members;

            const curParticipants: RoomParticipant[] = [];
            setHostId(response.data.hostId);

            for (const member of members) {
                let matchedParticipant: Participant | undefined;

                // 내 정보 매칭
                if (String(member.id) === room.localParticipant.identity) {
                    matchedParticipant = room.localParticipant;
                } else {
                    matchedParticipant = room.remoteParticipants.get(String(member.id));
                }

                const faceLandmarker = await initializeFaceLandmarker();

                curParticipants.push({
                    id: member.id,
                    gender: member.gender,
                    nickname: member.nickname,
                    info: matchedParticipant,
                    faceLandmarkerReady: !!faceLandmarker,
                    faceLandmarker,
                });
            }

            setParticipants(curParticipants);
            console.log('업데이트된 participants:', curParticipants);
        } catch (error) {
            console.error('updateParticipants 에러:', error);
        }
    };
    const addRoomEventHandler = async (room: Room, roomId: number) => {
        // 🔥 영상 트랙이 구독(ready)됐을 때
        room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
            if (track.kind === 'video') {
                console.log('영상 트랙 구독 완료:', participant);
                await updateParticipants(room, roomId); // 트랙 들어오면 participants 다시 갱신
            }
        });

        // 최초 입장 시 초기 participants 세팅
        await updateParticipants(room, roomId);
    };

    const createRoom = async ({
        videoRoomName,
        maxParticipants,
        mainTag,
        videoRoomHobbies,
        videoRoomPersonalities,
    }: VideoRoomRequest) => {
        try {
            const data = await postVideo({
                videoRoomName: videoRoomName,
                maxParticipants: maxParticipants,
                mainTag: mainTag,
                videoRoomHobbies: videoRoomHobbies,
                videoRoomPersonalities: videoRoomPersonalities,
                statusType: 1,
            });
            const room = new Room(ROOM_SETTING);
            await room.connect(LIVEKIT_URL, data?.data.token);
            setRoom(room);

            //videoTrack을 담는과정
            const videoTrack = await createLocalVideoTrack();
            await room.localParticipant.publishTrack(videoTrack);

            addRoomEventHandler(room, data.data.videoRoomId);

            setRoom(room);
            moveURL(window.location.pathname, data.data.videoRoomId);
        } catch (error) {
            console.log('방생성 에러');
        }
    };

    const joinRoom = async (videoRoomId: number) => {
        try {
            const room = new Room(ROOM_SETTING); //각 참가자마다 자신의 room을 갖는거임.
            const response = await postVideoJoin(videoRoomId); //새로운 참가자를 담아.
            await room.connect(LIVEKIT_URL, response.data.token); //라이브킷 연결

            setRoom(room); //room 상태 저장

            //videoTrack을 담는과정
            const videoTrack = await createLocalVideoTrack();
            await room.localParticipant.publishTrack(videoTrack);

            addRoomEventHandler(room, videoRoomId);

            moveURL(window.location.pathname, videoRoomId);
        } catch (error) {
            console.log('에러다');
        }
    };

    const moveURL = (currentPath: string, videoRoomId: number) => {
        if (currentPath.includes(PATH.MAIN)) {
            navigate(PATH.WAIT(videoRoomId));
        }
    };

    const leaveRoom = (videoRoomId: number) => {
        leaveVideoRoom.mutate(videoRoomId, {
            onSuccess: async () => {
                await room?.disconnect();
                setRoom(undefined);
            },
        });
        setParticipants([]);
    };

    return {
        hostId,
        isHost,
        createRoom,
        joinRoom,
        leaveRoom,
        participants,
    };
};

async function initializeFaceLandmarker(): Promise<FaceLandmarker | null> {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath:
                    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
        });
        return faceLandmarker;
    } catch (error) {
        console.error('Failed to initialize FaceLandmarker:', error);
        return null;
    }
}

export default useRoom;
