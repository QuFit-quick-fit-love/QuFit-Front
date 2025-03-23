import { getVideoDetail, postVideo, postVideoJoin } from '@apis/video/VideoApi';
import { LIVEKIT_URL, ROOM_SETTING } from '@components/video/VideoConstants';
import useMember from '@hooks/useMember';
import { useLeaveVideoRoomMutation } from '@queries/useVideoQuery';
import { VideoRoomRequest } from '@apis/types/request';
import {
    RoomParticipant,
    useHostIdStore,
    useOtherGenderParticipantsStore,
    useOtherIdxStore,
    usePrivateParticipantsStore,
    useRoomAddParticipantStore,
    useRoomParticipantsStore,
    useRoomSetParticipantsStore,
    useRoomStateStore,
    useSetHostIdStore,
    useSetOtherGenderParticipantsStore,
    useSetOtherIdxStore,
    useSetPrivateParticipantsStore,
    useSetRoomStateStore,
} from '@stores/video/roomStore';
import { Room, RoomEvent } from 'livekit-client';
import { useNavigate } from 'react-router-dom';
import { PATH } from '@routers/PathConstants';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const useRoom = () => {
    const setRoom = useSetRoomStateStore();
    const room = useRoomStateStore();
    const { member } = useMember();
    const navigate = useNavigate();
    const addParticipant = useRoomAddParticipantStore();
    const setParticipants = useRoomSetParticipantsStore();
    const setHostId = useSetHostIdStore();
    const hostId = useHostIdStore();
    const leaveVideoRoom = useLeaveVideoRoomMutation();
    const isHost = member?.memberId === hostId;

    const otherGenderParticipants = useOtherGenderParticipantsStore();
    const otherIdx = useOtherIdxStore();
    const setOtherIdx = useSetOtherIdxStore();

    const setOtherGenderParticipants = useSetOtherGenderParticipantsStore();
    const participants = useRoomParticipantsStore();

    const privateParticipants = usePrivateParticipantsStore();
    const setPrivateParticipants = useSetPrivateParticipantsStore();

    const otherGenderSetting = () => {
        const maleParticipants = participants
            .filter((participant) => participant.gender === 'm')
            .sort((a, b) => a.id! - b.id!);
        const femaleParticipants = participants
            .filter((participant) => participant.gender === 'f')
            .sort((a, b) => a.id! - b.id!);

        if (member?.gender === 'm') {
            const currentUserIndex = maleParticipants.findIndex((participant) => participant.id === member?.memberId);
            const reorderedOtherParticipants = femaleParticipants
                .slice(currentUserIndex)
                .concat(femaleParticipants.slice(0, currentUserIndex));
            setOtherGenderParticipants(reorderedOtherParticipants);
        } else if (member?.gender === 'f') {
            const currentUserIndex = femaleParticipants.findIndex((participant) => participant.id === member?.memberId);
            const reorderedOtherParticipants = maleParticipants
                .slice(currentUserIndex)
                .concat(maleParticipants.slice(0, currentUserIndex));
            setOtherGenderParticipants(reorderedOtherParticipants);
        }
    };

    const addRoomEventHandler = async (room: Room, roomId: number) => {
        room.on(RoomEvent.ParticipantConnected, async (participant) => {
            try {
                const response = await getVideoDetail(roomId);

                const newParticipant = response.data.members.find(
                    (member: { id: number; gender: 'f' | 'm'; nickname: string }) =>
                        member.id === Number(participant.identity),
                );

                const faceLandmarker = await initializeFaceLandmarker();
                addParticipant({
                    ...newParticipant,
                    info: participant,
                    faceLandmarkerReady: !!faceLandmarker,
                    faceLandmarker: faceLandmarker,
                });
            } catch (error) {
                console.error('Error in addRoomEventHandler:', error);
            }
        });
    };

    //방장을 정하려는 로직인듯? => createRoom 할때 쓸 것 같음.
    const decideManager = async (room: Room) => {
        await room.localParticipant.enableCameraAndMicrophone();
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

            addRoomEventHandler(room, data.data.videoRoomId);

            decideManager(room);
            setHostId(member?.memberId!);

            const faceLandmarker = await initializeFaceLandmarker();
            addParticipant({
                id: member?.memberId,
                gender: member?.gender,
                nickname: member?.nickname,
                info: room.localParticipant,
                faceLandmarkerReady: !!faceLandmarker,
                faceLandmarker: faceLandmarker,
            });

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

            const curParticipants: RoomParticipant[] = []; //여기에 새로운 참가자들을 담나?

            //remote사용자를 담는 과정
            try {
                const response = await getVideoDetail(videoRoomId); //이러면 지금 들어가려는 사람까지 다 나오겠지?

                Array.from(room.remoteParticipants.values()).forEach(async (participant) => {
                    const newParticipant = response.data.members.find(
                        (member: { id: number; gender: 'f' | 'm'; nickname: string }) =>
                            String(member.id) === participant.identity,
                    );

                    const faceLandmarker = await initializeFaceLandmarker();

                    curParticipants.push({
                        ...newParticipant,
                        info: participant,
                        faceLandmarkerReady: !!faceLandmarker,
                        faceLandmarker: faceLandmarker,
                    });
                });
                setHostId(response.data.hostId);
            } catch (error) {
                console.log('Error fetching video details:', error);
            }

            const faceLandmarker = await initializeFaceLandmarker();
            curParticipants.push({
                id: member?.memberId,
                gender: member?.gender,
                nickname: member?.nickname,
                info: room.localParticipant,
                faceLandmarkerReady: !!faceLandmarker,
                faceLandmarker: faceLandmarker,
            });
            setParticipants(curParticipants);
            addRoomEventHandler(room, videoRoomId);
            decideManager(room);

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

    const setPrivateRoom = () => {
        const curPrivateParticipants = [];
        const localParticipant = participants.find((participant) => participant.id === member?.memberId);
        const removeParticipants = participants.find(
            (participant) => participant.id === otherGenderParticipants[otherIdx].id,
        );
        if (localParticipant) {
            curPrivateParticipants.push(localParticipant);
        }
        if (removeParticipants) {
            curPrivateParticipants.push(removeParticipants);
        }

        setPrivateParticipants(curPrivateParticipants);
        setOtherIdx(otherIdx + 1);
    };

    return {
        hostId,
        isHost,
        createRoom,
        joinRoom,
        leaveRoom,
        otherGenderParticipants,
        otherIdx,
        setPrivateRoom,
        privateParticipants,
        participants,
        otherGenderSetting,
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

// joinVideoRoom.mutate(videoRoomId, {
//     onSuccess: async (response) => {
//         console.log('참여 성공');
//         await room.connect(LIVEKIT_URL, response?.data.token);
//         const curParticipants: RoomParticipant[] = [];
//         try {
//             const response = await getVideoDetail(videoRoomId);
//             Array.from(room.remoteParticipants.values()).forEach(async (participant) => {
//                 const newParticipant = response.data.members.find(
//                     (member: { id: number; gender: 'f' | 'm'; nickname: string }) =>
//                         String(member.id) === participant.identity,
//                 );

//                 const faceLandmarker = await initializeFaceLandmarker();
//                 curParticipants.push({
//                     ...newParticipant,
//                     info: participant,
//                     faceLandmarkerReady: !!faceLandmarker,
//                     faceLandmarker: faceLandmarker,
//                 });
//             });
//             setHostId(response.data.hostId);
//         } catch (error) {
//             console.log('Error fetching video details:', error);
//         }

//         const faceLandmarker = await initializeFaceLandmarker();
//         curParticipants.push({
//             id: member?.memberId,
//             gender: member?.gender,
//             nickname: member?.nickname,
//             info: room.localParticipant,
//             faceLandmarkerReady: !!faceLandmarker,
//             faceLandmarker: faceLandmarker,
//         });

//         setParticipants(curParticipants);
//         addRoomEventHandler(room, videoRoomId);
//         decideManager(room);

//         moveURL(window.location.pathname, videoRoomId);
//     },
// });

// createVideoRoom.mutate(
//     {
//         videoRoomName: videoRoomName,
//         maxParticipants: maxParticipants,
//         mainTag: mainTag,
//         videoRoomHobbies: videoRoomHobbies,
//         videoRoomPersonalities: videoRoomPersonalities,
//         statusType: 1,
//     },
//     {
//         onSuccess: async (data) => {
//             const room = new Room(ROOM_SETTING);
//             await room.connect(LIVEKIT_URL, data?.data.token);

//             addRoomEventHandler(room, data.data.videoRoomId);

//             decideManager(room);
//             setHostId(member?.memberId!);

//             const faceLandmarker = await initializeFaceLandmarker();
//             addParticipant({
//                 id: member?.memberId,
//                 gender: member?.gender,
//                 nickname: member?.nickname,
//                 info: room.localParticipant,
//                 faceLandmarkerReady: !!faceLandmarker,
//                 faceLandmarker: faceLandmarker,
//             });

//             console.log('createRoom 들어온 사람의 정보입니다.');
//             console.log(room.localParticipant);
//             setRoom(room);
//             moveURL(window.location.pathname, data.data.videoRoomId);
//         },
//         onError: async (data) => {
//             console.log('Error creating room:', data);
//         },
//     },
// );
