import { CupidIcon, DoorExitIcon } from '@assets/svg/chat';
import * as StompJs from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useMemberInfoStore } from '@stores/member/memberStore';
import { useParams } from 'react-router-dom';

type Props = {
    roomId: number;
    nickname?: string;
    profileImage?: string;
    refetch?: () => void;
};

type Message = {
    roomId: number;
    senderId: number;
    content: string;
    createdAt: string;
};

const VideoChatBox = () => {
    // STOMP 클라이언트를 위한 ref
    const client = useRef<StompJs.Client | null>(null);
    const [messages, setMessages] = useState<Message[]>([]); //채팅 메세지 전체
    const [chat, setChat] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { roomId } = useParams();

    // 예시: 현재 사용자의 ID (memberStore 등에서 가져올 수 있음)
    // const { senderId } = useMemberInfoStore();
    const senderId = 1;

    // STOMP 연결 및 구독 설정 (마운트 시)
    useEffect(() => {
        // SockJS 클라이언트를 이용해 STOMP 연결

        client.current = new StompJs.Client({
            brokerURL: 'ws://localhost:8080/stomp/chat',
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: `Bearer  ${localStorage.getItem('accessToken')}`,
            },
            onConnect: () => {
                //기존 메시지 세팅 한번해야겠네.
                console.log('웹소켓 연결 성공');

                // 채팅방 구독: 서버가 /sub/chat/{id} 경로로 메시지를 전송하면 받음.
                client.current?.subscribe(`/sub/chat/${roomId}`, (message) => {
                    console.log(message);
                    if (message.body) {
                        const receivedMessage = JSON.parse(message.body) as Message;
                        console.log(receivedMessage);
                        setMessages((prev) => [receivedMessage, ...prev]);
                    }
                });

                // 채팅방 참여 메시지 전송: 연결 후 join 메시지 발행
                // client.current?.publish({
                //     destination: '/pub/chat.joinRoom',
                //     body: JSON.stringify({
                //         senderId: senderId,
                //         chatRoomId: roomId,
                //         // 필요에 따라 추가 필드 설정 (예: roomId 대신 chatRoomId)
                //     }),
                // });
            },
            onStompError: (frame) => {
                console.log('웹소켓 연결 실패');
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.current.activate();

        console.log('url', (client.current as StompJs.Client).brokerURL);

        return () => {
            client.current?.deactivate();
        };
    }, [client.current]);

    const sendChat = () => {
        if (chat.trim() === '') {
            return;
        }

        // 메시지 전송: 서버의 /pub/chat.sendMessage 엔드포인트로 전송
        client.current?.publish({
            destination: '/pub/chat.sendMessage',
            body: JSON.stringify({
                sender: senderId,
                roomId: roomId,
                content: chat,
            }),
        });

        // refetch();
        setChat('');
    };

    return (
        <div className="w-full max-h-[calc(100%-6.5rem)] h-[calc(100%-6.5rem)] effect-whitePink bg-pink bg-opacity-5 rounded-[1.875rem]">
            <div className="z-10 flex flex-col w-full h-full px-12 pb-12">
                <div id="scrollableDiv" className="flex flex-col-reverse h-full overflow-y-auto my-7 scrollbar-hide">
                    {messages.map((message) => (
                        <div key={message.createdAt} className="mb-2 text-white ">
                            <strong>{message.senderId}:</strong> {message.content}
                            <div className="text-xs text-gray-400">
                                {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                })}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="relative flex items-center mt-auto">
                    <input
                        type="text"
                        value={chat}
                        onChange={(e) => setChat(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                sendChat();
                            }
                        }}
                        placeholder="채팅을 입력하세요."
                        className="w-full pr-20 text-white bg-transparent border rounded-full outline-none h-14 pl-7 placeholder:text-white placeholder:opacity-60"
                    />
                    <button onClick={sendChat} className="absolute mr-10 right-6">
                        <CupidIcon className="w-10" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoChatBox;
