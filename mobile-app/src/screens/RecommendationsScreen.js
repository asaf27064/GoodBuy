import React, { useState, useEffect } from 'react';
import { SafeAreaView, FlatList, View, StyleSheet } from 'react-native';
import {
  useTheme,
  Card,
  Button,
  Text,
  Paragraph,
  ActivityIndicator,
  IconButton,
  Chip,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function RecommendationsScreen({ route, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { listObj } = route.params;
  const { user } = useAuth();

  const [mainRecs, setMainRecs] = useState([]);
  const [supplementaryAI, setSupplementaryAI] = useState([]);
  const [supplementaryOther, setSupplementaryOther] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showingAI, setShowingAI] = useState(false);
  const [showingOther, setShowingOther] = useState(false);

  const fetchRecommendations = async (showAllAI = false) => {
    try {
      const { data } = await axios.get(
        `/api/Recommendations?listId=${listObj._id}&showAllAI=${showAllAI}`
      );
      
      // Handle both old format (array) and new format (object)
      if (Array.isArray(data)) {
        setMainRecs(data);
        setSupplementaryAI([]);
        setSupplementaryOther([]);
        setStats({});
      } else {
        setMainRecs(data.main || []);
        
        // Debug: Let's see what we're getting
        console.log('🔍 All supplementary items:', data.supplementaryAI);
        
        // Separate AI and non-AI supplementary items
        const aiItems = (data.supplementaryAI || []).filter(item => item.method === 'ai');
        const otherItems = (data.supplementaryAI || []).filter(item => item.method !== 'ai');
        
        console.log('🤖 AI items:', aiItems.length, aiItems);
        console.log('🔧 Other items:', otherItems.length, otherItems);
        
        setSupplementaryAI(aiItems);
        setSupplementaryOther(otherItems);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      // Always load with showAllAI=true for demo purposes
      await fetchRecommendations(true);
      setLoading(false);
    })();
  }, [listObj._id]);

  const handleShowAI = () => {
    setShowingAI(!showingAI);
  };

  const handleShowOther = () => {
    setShowingOther(!showingOther);
  };

  const handleAdd = (item) =>
    navigation.navigate('EditItems', { addedItem: item, listObj });
    
  const handleDismiss = (code, isSupplementary = false, isAI = false) => {
    if (isSupplementary) {
      if (isAI) {
        setSupplementaryAI(prev => prev.filter(r => r.itemCode !== code));
      } else {
        setSupplementaryOther(prev => prev.filter(r => r.itemCode !== code));
      }
    } else {
      setMainRecs(prev => prev.filter(r => r.itemCode !== code));
    }
  };

  const renderItem = ({ item }) => {
    const lastDate = item.lastPurchased
      ? new Date(item.lastPurchased)
      : null;
    const dateText = lastDate
      ? lastDate.toLocaleDateString()
      : null;
    const lastLabel = lastDate
      ? `Last purchased on ${dateText}`
      : 'Never purchased before';

    let methodLabel = '';
    switch (item.method) {
      case 'habit':
        methodLabel = lastDate
          ? `You typically buy this on ${lastDate.toLocaleDateString(undefined, { weekday: 'long' })}`
          : 'Habit-based recommendation';
        break;
      case 'co-occurrence':
        methodLabel = 'Often bought together with items in your list';
        break;
      case 'personal':
        methodLabel = 'Recommended from your past purchases';
        break;
      case 'cf':
        methodLabel = 'Popular with shoppers like you';
        break;
      case 'ai':
        methodLabel = 'Suggested by AI';
        break;
      default:
        methodLabel = '';
    }

    const cardStyle = item.isSupplementary 
      ? [styles.card, styles.supplementaryCard, { backgroundColor: theme.colors.surfaceVariant }]
      : [styles.card, { backgroundColor: theme.colors.surface }];

    return (
      <Card style={cardStyle}>
        {item.image && (
          <Card.Cover source={{ uri: item.image }} style={styles.cover} />
        )}
        <Card.Title
          title={item.name}
          subtitle={methodLabel}
          titleNumberOfLines={1}
          subtitleNumberOfLines={1}
          titleStyle={{ color: theme.colors.onSurface }}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          left={props =>
            item.method === 'ai' ? (
              <IconButton
                {...props}
                icon="robot"
                size={20}
                color={theme.colors.primary}
              />
            ) : null
          }
          right={props => (
            <View style={styles.rightActions}>
              {item.isSupplementary && (
                <Chip 
                  mode="outlined" 
                  compact 
                  style={styles.supplementaryChip}
                  textStyle={{ fontSize: 10 }}
                >
                  {item.method === 'ai' ? 'AI Extra' : 'Extra'}
                </Chip>
              )}
              <IconButton
                {...props}
                icon="close"
                onPress={() => handleDismiss(item.itemCode, item.isSupplementary, item.method === 'ai')}
                color={theme.colors.disabled}
              />
            </View>
          )}
        />
        <Card.Content>
          {item.method === 'ai' && item.suggestionReason ? (
            <Paragraph style={[styles.reasonText, { color: theme.colors.onSurfaceVariant }]}>
              {item.suggestionReason}
            </Paragraph>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
              {lastLabel}
            </Text>
            <Button
              mode="contained"
              compact
              onPress={() => handleAdd(item)}
              contentStyle={styles.addButtonContent}
              style={{ backgroundColor: theme.colors.primary }}
              labelStyle={{ color: theme.colors.onPrimary }}
            >
              Add to list
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Display */}
      {stats.totalAIGenerated > 0 && (
        <View style={styles.statsContainer}>
          <Text style={[styles.statsText, { color: theme.colors.onSurfaceVariant }]}>
            AI Generated: {stats.totalAIGenerated} suggestions • 
            Used in main: {stats.aiUsedInMain}
            {stats.pureAISupplementary > 0 && ` • AI Extra: ${stats.pureAISupplementary}`}
            {stats.otherMethodsSupplementary > 0 && ` • Other Extra: ${stats.otherMethodsSupplementary}`}
          </Text>
        </View>
      )}
      
      {/* AI Toggle Button */}
      {(supplementaryAI.length > 0 || stats.totalAIGenerated > 0) && (
        <Button
          mode={showingAI ? "contained" : "outlined"}
          onPress={handleShowAI}
          icon="robot"
          style={styles.aiButton}
          contentStyle={styles.aiButtonContent}
        >
          {showingAI 
            ? `Hide AI Extras (${supplementaryAI.length})` 
            : `Show AI Extras (${supplementaryAI.length})`
          }
        </Button>
      )}

      {/* Other Methods Toggle Button */}
      {supplementaryOther.length > 0 && (
        <Button
          mode={showingOther ? "contained" : "outlined"}
          onPress={handleShowOther}
          icon="lightbulb-outline"
          style={styles.aiButton}
          contentStyle={styles.aiButtonContent}
        >
          {showingOther 
            ? `Hide Other Ideas (${supplementaryOther.length})` 
            : `Show Other Ideas (${supplementaryOther.length})`
          }
        </Button>
      )}

      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Main Recommendations
      </Text>
    </View>
  );

  const renderAISection = () => {
    if (!showingAI || supplementaryAI.length === 0) return null;
    
    return (
      <View style={styles.aiSection}>
        <Divider style={styles.divider} />
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Additional AI Suggestions
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          More ideas from AI that didn't make the main list
        </Text>
      </View>
    );
  };

  const renderOtherSection = () => {
    if (!showingOther || supplementaryOther.length === 0) return null;
    
    return (
      <View style={styles.aiSection}>
        <Divider style={styles.divider} />
        <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
          Other Suggestions
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Additional recommendations from other methods
        </Text>
      </View>
    );
  };

  const allData = [
    ...mainRecs,
    ...(showingAI ? supplementaryAI : []),
    ...(showingOther ? supplementaryOther : [])
  ];

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={allData}
        keyExtractor={item => `${item.itemCode}-${item.isSupplementary ? 'supp' : 'main'}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
              No recommendations right now. Try adding items to your list first!
            </Text>
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 60 }]}
        ItemSeparatorComponent={({ leadingItem, index }) => {
          if (!leadingItem || leadingItem.isSupplementary) return null;
          
          const nextIndex = index + 1;
          const nextItem = allData[nextIndex];
          
          // Show AI section separator before first AI supplementary item
          if (nextItem && nextItem.isSupplementary && nextItem.method === 'ai' && 
              showingAI && supplementaryAI.length > 0) {
            return renderAISection();
          }
          
          // Show Other section separator before first non-AI supplementary item
          // Only if we're not already in AI section
          if (nextItem && nextItem.isSupplementary && nextItem.method !== 'ai' && 
              showingOther && supplementaryOther.length > 0 &&
              !allData.slice(0, nextIndex).some(item => item.isSupplementary && item.method === 'ai' && showingAI)) {
            return renderOtherSection();
          }
          
          return null;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 8 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  statsContainer: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  aiButton: {
    marginVertical: 8,
  },
  aiButtonContent: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  aiSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  supplementaryCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50', // Green border for AI extras
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplementaryChip: {
    marginRight: 4,
    height: 24,
  },
  cover: { height: 120 },
  reasonText: {
    fontStyle: 'italic',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: { fontSize: 12 },
  addButtonContent: { paddingVertical: 4, paddingHorizontal: 12 },
  emptyContainer: { marginTop: 40, alignItems: 'center' },
});