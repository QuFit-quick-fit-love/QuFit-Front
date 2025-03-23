import Layout from '@components/common/Layout';
import VideoPageLayout from '@components/common/VideoPageLayout';
import ChattingPage from '@pages/ChattingPage';
import GroupVideoPage from '@pages/video/GroupVideoPage';
import IntroductionPage from '@pages/IntroductionPage';
import KakaoRedirectPage from '@pages/KaKaoRedirectPage';
import MainPage from '@pages/MainPage';
import CreateRoomPage from '@pages/CreateRoomPage';
import RecommendedRoomPage from '@pages/RecommendedRoomPage';
import MyPage from '@pages/Mypage';
import NotFoundPage from '@pages/NotFoundPage';
import PersonalVideoPage from '@pages/video/PersonalVideoPage';
import SignupPage from '@pages/SignupPage';
import VideoWaitPage from '@pages/video/VideoWaitPage';
import { PATH } from '@routers/PathConstants';
import { RouterProvider, createBrowserRouter, RouteObject } from 'react-router-dom';
import Admin from '@pages/Admin';
import GroupVideoLayout from '@pages/video/GroupVideoLayout';

const Router = () => {
    const routes: RouteObject[] = [
        {
            path: PATH.ROOT,
            errorElement: <NotFoundPage />,
            children: [
                {
                    path: PATH.ROOT,
                    element: <IntroductionPage />,
                },
                { path: PATH.INTRODUCTION, element: <IntroductionPage /> },
            ],
        },
        //header가 있는 페이지
        {
            path: PATH.ROOT,
            element: <Layout />,
            errorElement: <NotFoundPage />,
            children: [
                {
                    path: PATH.MAIN,
                    element: <MainPage />,
                },
                {
                    path: PATH.CREATE_ROOM,
                    element: <CreateRoomPage />,
                },
                {
                    path: PATH.RECOMMEND_ROOM,
                    element: <RecommendedRoomPage />,
                },
                {
                    path: PATH.CHATTING,
                    element: <ChattingPage />,
                },
                {
                    path: PATH.MY_PAGE,
                    element: <MyPage />,
                },
            ],
        },

        //header가 없는 부분
        {
            path: PATH.ROOT,
            element: <VideoPageLayout />,
            errorElement: <NotFoundPage />,
            children: [
                {
                    path: '/', // `/video/group/:roomId`
                    element: <GroupVideoLayout />,
                    children: [
                        {
                            path: PATH.WAIT(':roomId'), // ✅ 이제 부모 경로(`/video/group/:roomId`) 아래에서 자동으로 `/wait`이 붙음
                            element: <VideoWaitPage />,
                        },
                        {
                            path: PATH.GROUP_VIDEO(':roomId'),
                            element: <GroupVideoPage />,
                        },
                    ],
                },
                {
                    path: PATH.PERSONAL_VIDEO(':roomId'),
                    element: <PersonalVideoPage />,
                },
                {
                    path: PATH.SIGN_UP,
                    element: <SignupPage />,
                },
                {
                    path: PATH.ADMIN,
                    element: <Admin />,
                },
            ],
        },

        {
            path: 'auth/kakao',
            element: <KakaoRedirectPage />,
        },
    ];

    const router = createBrowserRouter([...routes]);
    return <RouterProvider router={router} />;
};

export default Router;
