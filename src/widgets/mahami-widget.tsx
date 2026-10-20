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
//
// Layout follows Apple's guidance for widgets: each size keeps the same purpose
// (today) and adds depth rather than stretching the small one; text never drops
// below 11pt; finishing a task is a button, as in Apple's own Reminders widget;
// and the widget always shows something useful instead of an empty placeholder.
const MahamiToday = (rawProps: MahamiWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  // Before the app has ever pushed — the gallery preview, a fresh install, or a
  // build whose data never arrived — the props are empty. Reading colours off
  // them used to throw and leave a blank dark tile, so fall back to sand.
  const p = (rawProps ?? {}) as Partial<MahamiWidgetProps>;
  const sand = {
    canvas: '#F6F1E8',
    surface: '#FFFDFC',
    ink: '#2E241D',
    muted: '#75675C',
    primary: '#6D4935',
    accent: '#B9825A',
    success: '#4E725B',
    urgent: '#A9493D',
    important: '#C47A3C',
    later: '#9A8E82',
  };
  const c = p.colors ?? sand;
  const link = p.link || 'mahami:///home';
  const tasks = p.tasks ?? [];
  const routines = p.routines ?? [];
  const total = p.total ?? 0;
  const completed = p.completed ?? 0;
  const family = environment.widgetFamily;
  const shell = [containerBackground(c.canvas, 'widget'), widgetURL(link)];

  if (!p.colors) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={shell}>
        <Image systemName="checklist" size={22} color={c.primary} />
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(c.ink)]}>مهام اليوم</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>افتح مهامي مرة لتظهر مهامك هنا.</Text>
      </VStack>
    );
  }

  if (!p.signedIn) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={shell}>
        <Image systemName="person.crop.circle" size={22} color={c.primary} />
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(c.ink)]}>مهام اليوم</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>سجّل الدخول لتظهر مهامك هنا.</Text>
      </VStack>
    );
  }

  const remaining = Math.max(total - completed, 0);
  const ratio = total > 0 ? completed / total : 0;
  const percent = Math.round(ratio * 100);

  // What onPress returns becomes the widget's props: the runtime writes them back
  // into the timeline the app reads, without the app running. The id goes into
  // pendingDone so the app can write it to Supabase on its next run.
  const finish = (id: string) => ({
    ...p,
    tasks: tasks.map((task) => (task.id === id ? { ...task, done: true } : task)),
    completed: Math.min(completed + 1, total),
    pendingDone: (p.pendingDone ?? []).includes(id) ? p.pendingDone : [...(p.pendingDone ?? []), id],
  });

  const toneColor = (tone: string) => (tone === 'urgent' ? c.urgent : tone === 'important' ? c.important : c.later);

  const taskRow = (task: MahamiWidgetProps['tasks'][number]) => (
    <HStack key={task.id} spacing={9}>
      {task.done ? (
        <Image systemName="checkmark.circle.fill" size={22} color={c.success} />
      ) : (
        <Button target={`done:${task.id}`} onPress={() => finish(task.id)} modifiers={[buttonStyle('plain')]}>
          <Image systemName="circle" size={22} color={toneColor(task.tone)} />
        </Button>
      )}
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ size: 14, weight: 'medium' }),
            foregroundStyle(task.done ? c.muted : c.ink),
            lineLimit(1),
            strikethrough({ isActive: task.done, pattern: 'solid', color: c.muted }),
          ]}>
          {task.title}
        </Text>
        {task.time ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(c.muted)]}>{task.time}</Text>
        ) : null}
      </VStack>
      <Spacer />
    </HStack>
  );

  const emptyTasks = (
    <Text modifiers={[font({ size: 13 }), foregroundStyle(c.muted)]}>لا مهام لليوم. يومك صافٍ.</Text>
  );

  const progress = <ProgressView value={ratio} modifiers={[tint(c.primary)]} />;

  const updated = p.updatedAt ? (
    <Text modifiers={[font({ size: 11 }), foregroundStyle(c.muted)]}>{`آخر تحديث ${p.updatedAt}`}</Text>
  ) : null;

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={shell}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>اليوم</Text>
        <Spacer />
        <Text modifiers={[font({ size: 42, weight: 'bold', design: 'rounded' }), foregroundStyle(c.ink)]}>
          {`${remaining}`}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>
          {total === 0 ? 'لا مهام اليوم' : remaining === 0 ? 'أنجزت كل شيء' : remaining === 1 ? 'مهمة متبقية' : 'مهام متبقية'}
        </Text>
        {progress}
      </VStack>
    );
  }

  if (family === 'systemMedium') {
    return (
      <HStack spacing={14} modifiers={shell}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ width: 92 })]}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>اليوم</Text>
          <Text modifiers={[font({ size: 32, weight: 'bold', design: 'rounded' }), foregroundStyle(c.ink)]}>
            {`${percent}%`}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>{`${completed} من ${total}`}</Text>
          {progress}
        </VStack>
        <VStack alignment="leading" spacing={9}>
          {tasks.length === 0 ? emptyTasks : tasks.slice(0, 3).map(taskRow)}
          <Spacer />
        </VStack>
      </HStack>
    );
  }

  // systemLarge
  return (
    <VStack alignment="leading" spacing={10} modifiers={shell}>
      <HStack>
        <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle(c.ink)]}>مهام اليوم</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>
          {`${completed} من ${total}`}
        </Text>
      </HStack>
      {progress}
      <VStack alignment="leading" spacing={10}>
        {tasks.length === 0 ? emptyTasks : tasks.map(taskRow)}
      </VStack>
      {routines.length > 0 ? (
        <VStack alignment="leading" spacing={8}>
          <Divider />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.muted)]}>الروتين</Text>
          {routines.map((routine) => (
            <HStack key={routine.id} spacing={9}>
              <Image
                systemName={routine.done ? 'checkmark.seal.fill' : 'arrow.triangle.2.circlepath'}
                size={16}
                color={routine.done ? c.success : c.accent}
              />
              <Text modifiers={[font({ size: 13 }), foregroundStyle(c.ink), lineLimit(1)]}>{routine.title}</Text>
              <Spacer />
              {routine.streak > 0 ? (
                <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(c.accent)]}>
                  {`🔥 ${routine.streak}`}
                </Text>
              ) : null}
            </HStack>
          ))}
        </VStack>
      ) : null}
      <Spacer />
      {updated}
    </VStack>
  );
};

export default createWidget('MahamiToday', MahamiToday);
