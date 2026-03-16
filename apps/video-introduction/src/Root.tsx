import { Composition } from 'remotion';
import { IntroVideo } from './IntroVideo';
import './index.css';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        fps={30}
        durationInFrames={1750} // ~58 seconds with extended year reflection
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Divergent Todos',
          subtitle: 'Take back your attention by planning it',
        }}
      />
    </>
  );
};
