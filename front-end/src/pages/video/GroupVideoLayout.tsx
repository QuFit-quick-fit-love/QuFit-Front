import { useRoomParticipantsStore } from '@stores/video/roomStore';
import ParticipantVideo from '@components/video/ParticipantVideo';
import { useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import useRoom from '@hooks/useRoom';

const GroupVideoLayout = () => {
    const roomMax = 8;
    const { joinRoom, leaveRoom, participants } = useRoom();
    const { roomId } = useParams();
    const [render, setRender] = useState(10);
    const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setRender((prev: number) => prev - 1);
        }, 100);

        setTimerId(timer);

        return () => {
            clearInterval(timer);
        };
    }, [participants]);
    useEffect(() => {
        const timer = setInterval(() => {
            setRender((prev: number) => prev - 1);
        }, 100);

        setTimerId(timer);

        return () => {
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (render === 0) {
            if (timerId) {
                clearInterval(timerId);
                setTimerId(null);
            }
        }
    }, [render]);

    // useEffect(() => {
    //     async function reloadRoom() {
    //         await leaveRoom(Number(roomId));
    //         await joinRoom(Number(roomId));
    //     }
    //     reloadRoom();
    // }, []);

    return (
        <div className="flex flex-col justify-between h-screen">
            <div className="flex-shrink-0">
                <ParticipantVideo roomMax={roomMax!} gender="m" status="wait" participants={participants} />
            </div>
            <div className="flex items-center justify-between flex-grow gap-7">
                <div className="border w-[916px] max-w-[916px] h-[496px] flex flex-grow justify-center items-center">
                    <Outlet />
                </div>
                {/* <VideoChatBox /> */}
            </div>
            <div className="flex-shrink-0">
                <ParticipantVideo participants={participants} roomMax={roomMax!} gender="f" status="wait" />
            </div>
        </div>
    );
};

export default GroupVideoLayout;

/* <div className="hidden">
                    {participants.map((participant) => (
                        <AudioComponent
                            key={participant.nickname}
                            track={
                                participant.info.audioTrackPublications.values().next().value?.audioTrack || undefined
                            }
                        />
                    ))}
                </div> */
