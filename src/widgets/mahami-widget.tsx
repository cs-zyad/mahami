import { Button, Divider, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  strikethrough,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { MahamiWidgetProps } from './widget-props';

// The 'widget' directive compiles this function into a separate bundle that
// runs inside the widget extension. It may not reference anything declared
// outside itself — no module constants, no helpers, no hooks — so every value
// it needs is defined here or arrives through props.
const MahamiToday = (props: MahamiWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const c = props.colors;
  const family = environment.widgetFamily;
  const remaining = Math.max(props.total - props.completed, 0);
  const ratio = props.total > 0 ? props.completed / props.total : 0;
  const percent = Math.round(ratio * 100);
  const shell = [containerBackground(c.canvas, 'widget'), widgetURL(props.link)];

  if (!props.signedIn) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={shell}>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(c.ink)]}>مهامي</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>سجّل الدخول لتظهر مهامك هنا.</Text>
      </VStack>
    );
  }

  // Finishing a task from the home screen. What onPress returns becomes the
  // widget's props, persisted by the runtime without the app running; the id
  // goes into pendingDone so the app can write it to Supabase on its next run.
  const finish = (id: string) => ({
    ...props,
    tasks: props.tasks.map((task) => (task.id === id ? { ...task, done: true } : task)),
    completed: Math.min(props.completed + 1, props.total),
    pendingDone: props.pendingDone.includes(id) ? props.pendingDone : [...props.pendingDone, id],
  });

  const toneColor = (tone: string) => (tone === 'urgent' ? c.urgent : tone === 'important' ? c.important : c.later);

  const taskRow = (task: MahamiWidgetProps['tasks'][number]) => (
    <HStack key={task.id} spacing={8}>
      {task.done ? (
        <Image systemName="checkmark.circle.fill" size={18} color={c.success} />
      ) : (
        <Button target={`done:${task.id}`} onPress={() => finish(task.id)} modifiers={[buttonStyle('plain')]}>
          <Image systemName="circle" size={18} color={toneColor(task.tone)} />
        </Button>
      )}
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ size: 13, weight: 'medium' }),
            foregroundStyle(task.done ? c.muted : c.ink),
            lineLimit(1),
            strikethrough({ isActive: task.done, pattern: 'solid', color: c.muted }),
          ]}>
          {task.title}
        </Text>
        {task.time ? (
          <Text modifiers={[font({ size: 10 }), foregroundStyle(c.muted)]}>{task.time}</Text>
        ) : null}
      </VStack>
      <Spacer />
    </HStack>
  );

  const emptyTasks = (
    <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>لا مهام لليوم. يومك صافٍ.</Text>
  );

  const progress = (
    <ProgressView value={ratio} modifiers={[tint(c.primary)]} />
  );

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={shell}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>اليوم</Text>
        <Spacer />
        <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundStyle(c.ink)]}>
          {`${remaining}`}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>
          {remaining === 0 ? 'أنجزت كل شيء' : remaining === 1 ? 'مهمة متبقية' : 'مهام متبقية'}
        </Text>
        {progress}
      </VStack>
    );
  }

  if (family === 'systemMedium') {
    return (
      <HStack spacing={14} modifiers={shell}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ width: 96 })]}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(c.muted)]}>اليوم</Text>
          <Text modifiers={[font({ size: 30, weight: 'bold', design: 'rounded' }), foregroundStyle(c.ink)]}>
            {`${percent}%`}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(c.muted)]}>
            {`${props.completed} من ${props.total}`}
          </Text>
          {progress}
        </VStack>
        <VStack alignment="leading" spacing={8}>
          {props.tasks.length === 0 ? emptyTasks : props.tasks.slice(0, 3).map(taskRow)}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // systemLarge
  return (
    <VStack alignment="leading" spacing={10} modifiers={shell}>
      <HStack>
        <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(c.ink)]}>مهام اليوم</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>
          {`${props.completed} من ${props.total}`}
        </Text>
      </HStack>
      {progress}
      <VStack alignment="leading" spacing={9}>
        {props.tasks.length === 0 ? emptyTasks : props.tasks.map(taskRow)}
      </VStack>
      {props.routines.length > 0 ? (
        <VStack alignment="leading" spacing={7}>
          <Divider />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>الروتين</Text>
          {props.routines.map((routine) => (
            <HStack key={routine.id} spacing={8}>
              <Image
                systemName={routine.done ? 'checkmark.seal.fill' : 'arrow.triangle.2.circlepath'}
                size={14}
                color={routine.done ? c.success : c.accent}
              />
              <Text modifiers={[font({ size: 12 }), foregroundStyle(c.ink), lineLimit(1)]}>{routine.title}</Text>
              <Spacer />
              {routine.streak > 0 ? (
                <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(c.accent)]}>
                  {`🔥 ${routine.streak}`}
                </Text>
              ) : null}
            </HStack>
          ))}
        </VStack>
      ) : null}
      <Spacer />
    </VStack>
  );
};

export default createWidget('MahamiToday', MahamiToday);
