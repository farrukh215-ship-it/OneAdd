import { Pressable, Text, View } from 'react-native';

export function SectionHeader({
  title,
  linkLabel = 'Sab Dekho',
  onPress,
}: {
  title: string;
  linkLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-3 py-3">
      <Text className="text-[16px] font-bold text-ink">{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress}>
          <Text className="text-[13px] font-semibold text-red">{linkLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
