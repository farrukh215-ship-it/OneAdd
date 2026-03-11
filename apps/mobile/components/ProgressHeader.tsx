import { Text, View } from 'react-native';

export function ProgressHeader({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <View className="border-b border-border bg-white px-4 pb-4 pt-5">
      <View className="mb-3 flex-row gap-2">
        {[1, 2, 3, 4].map((index) => (
          <View
            key={index}
            className={`h-2 flex-1 rounded-full ${index <= step ? 'bg-red' : 'bg-border'}`}
          />
        ))}
      </View>
      <Text className="text-lg font-extrabold text-ink">{title}</Text>
      <Text className="mt-1 text-xs text-ink2">Step {step} / 4</Text>
    </View>
  );
}
