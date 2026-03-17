import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress}>
          <Text style={styles.link}>{linkLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  title: {
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '700',
  },
});
