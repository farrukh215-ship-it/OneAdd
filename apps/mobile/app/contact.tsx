import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tgmgContact } from '../lib/contact';

const actions = [
  { label: 'Website', value: 'www.teragharmeraghar.com', url: tgmgContact.website, accent: '#E53935' },
  { label: 'Facebook', value: 'teragharmeraghar', url: tgmgContact.facebook, accent: '#1877F2' },
  { label: 'Instagram', value: '@teragharmeraghar', url: tgmgContact.instagram, accent: '#C13584' },
  { label: 'WhatsApp', value: tgmgContact.phone, url: tgmgContact.whatsapp, accent: '#25D366' },
];

export default function ContactScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>TGMG.</Text>
      <Text style={styles.title}>Contact</Text>
      <Text style={styles.subtitle}>Website ke tamam official contact links yahan hain.</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Office</Text>
        <Text style={styles.heroValue}>{tgmgContact.office}</Text>
        <Text style={styles.heroLabel}>Email</Text>
        <Text style={styles.heroValue}>{tgmgContact.email}</Text>
      </View>

      {actions.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => void Linking.openURL(item.url)}
          style={[styles.actionCard, { borderColor: item.accent }]}
        >
          <View>
            <Text style={styles.actionTitle}>{item.label}</Text>
            <Text style={styles.actionValue}>{item.value}</Text>
          </View>
          <Text style={[styles.actionArrow, { color: item.accent }]}>Open</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  brand: {
    color: '#E53935',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    color: '#1C1E21',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#65676B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  heroLabel: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: '#1C1E21',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 16,
  },
  actionTitle: {
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '800',
  },
  actionValue: {
    color: '#65676B',
    fontSize: 13,
    marginTop: 4,
  },
  actionArrow: {
    fontSize: 13,
    fontWeight: '800',
  },
});
