import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { AppIcon } from './AppIcon';
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid';

type AppIconsChaosProps = {
  startFrame: number;
};

export const AppIconsChaos: React.FC<AppIconsChaosProps> = ({ startFrame }) => {
  const notificationPopOutStart = 60; // After all apps pop in

  const apps = [
    {
      icon: ChatBubbleLeftRightIcon,
      color: 'rgb(109 40 217)', // purple-700
      notifications: 3,
      position: { x: 20, y: 50 }, // Vertically centered
      delay: 10, // Start sooner without header
      notificationDelay: 10, // Same time as icon
      notificationPopOutDelay: 0,
    },
    {
      icon: EnvelopeIcon,
      color: 'rgb(220 38 38)', // red-600
      notifications: 5,
      position: { x: 40, y: 50 }, // Same vertical position
      delay: 14, // Overlaps with previous (starts 4 frames later)
      notificationDelay: 14, // Same time as icon
      notificationPopOutDelay: 10,
    },
    {
      icon: CalendarIcon,
      color: 'rgb(37 99 235)', // blue-600
      notifications: 2,
      position: { x: 60, y: 50 }, // Same vertical position
      delay: 18, // Overlaps with previous
      notificationDelay: 18, // Same time as icon
      notificationPopOutDelay: 20,
    },
    {
      icon: ChartBarIcon,
      color: 'rgb(67 56 202)', // indigo-700
      notifications: 4,
      position: { x: 80, y: 50 }, // Same vertical position
      delay: 22, // Overlaps with previous
      notificationDelay: 22, // Same time as icon
      notificationPopOutDelay: 30,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgb(17 24 39)' }}>
      {/* Apps pop in one at a time with notifications */}
      {apps.map((app, index) => (
        <AppIcon
          key={index}
          icon={app.icon}
          color={app.color}
          notifications={app.notifications}
          startFrame={startFrame + app.delay}
          notificationStartFrame={startFrame + app.notificationDelay}
          notificationPopOutFrame={startFrame + notificationPopOutStart + app.notificationPopOutDelay}
          position={app.position}
        />
      ))}
    </AbsoluteFill>
  );
};
