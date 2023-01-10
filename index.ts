import {PureComponent, createElement as $, RefObject, createRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import groupBy from 'just-group-by';
import mapValues from 'just-map-values';
const noop = () => {};

interface Emoji {
  category: string;
  unified: string;
  short_name: string;
  added_in: string;
  _score: number;
}

// Conversion of codepoints and surrogate pairs. See more here:
// https://mathiasbynens.be/notes/javascript-unicode
// https://mathiasbynens.be/notes/javascript-escapes#unicode-code-point
// and `String.fromCodePoint` on MDN
function charFromUtf16(utf16: string) {
  return String.fromCodePoint(
    ...(utf16.split('-').map((u) => '0x' + u) as any),
  );
}

function charFromEmojiObj(obj: Emoji): string {
  return charFromUtf16(obj.unified);
}

type LocalizedCategories = [
  string, // Smileys & Emotion
  string, // People & Body
  string, // Animals & Nature
  string, // Food & Drink
  string, // Activities
  string, // Travel & Places
  string, // Objects
  string, // Symbols
  string, // Flags
];

const CATEGORIES: LocalizedCategories = [
  'Smileys & Emotion',
  'People & Body',
  'Animals & Nature',
  'Food & Drink',
  'Activities',
  'Travel & Places',
  'Objects',
  'Symbols',
  'Flags',
];

function categoryToIcon(cat: string) {
  if (cat === 'Smileys & Emotion') return 'emoticon';
  if (cat === 'People & Body') return 'human-greeting';
  if (cat === 'Animals & Nature') return 'cat';
  if (cat === 'Food & Drink') return 'food-apple';
  if (cat === 'Activities') return 'tennis-ball';
  if (cat === 'Travel & Places') return 'car';
  if (cat === 'Objects') return 'lightbulb';
  if (cat === 'Symbols') return 'alert';
  if (cat === 'Flags') return 'flag-variant';
  return 'emoticon-cool';
}

const DEFAULT_EMOJI_SIZE = 32;
const SHORTCUT_SIZE = DEFAULT_EMOJI_SIZE * 0.75;
const SEARCH_ICON_SIZE = DEFAULT_EMOJI_SIZE * 0.625;
const PADDING = 5;
const DEFAULT_COLUMNS = 7;
const ROWS_VISIBLE = DEFAULT_COLUMNS;
const EMOJI_GROUP_PADDING_BOTTOM = PADDING * 3;
const TOTAL_HEIGHT = DEFAULT_EMOJI_SIZE * ROWS_VISIBLE + PADDING * 2;

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  background: {
    backgroundColor: '#00000077',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },

  container: {
    backgroundColor: 'white',
    padding: 0,
    borderRadius: 10,
    flexDirection: 'column',
  },

  scrollerContainer: {
    minHeight: TOTAL_HEIGHT,
    maxHeight: TOTAL_HEIGHT,
    ...Platform.select({
      web: {
        overflowY: 'scroll',
      },
    }),
  },

  scroller: {
    flexDirection: 'column',
    minHeight: TOTAL_HEIGHT,
    maxHeight: TOTAL_HEIGHT,
    paddingHorizontal: PADDING,
  },

  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    paddingTop: PADDING,
    paddingHorizontal: PADDING,
    paddingBottom: 2,
  },

  search: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    marginTop: 3,
    marginHorizontal: 3,
    height: 4 + 20 + 4,
    paddingVertical: 4,
    paddingLeft: 32,
    paddingRight: 12,
    borderRadius: 3,
    color: '#2f2f2f',
    zIndex: 10,
  },

  searchIcon: {
    position: 'absolute',
    left: 16,
    top: PADDING + 3 + 4,
    zIndex: 20,
  },

  headerText: {
    padding: PADDING,
    color: 'black',
    fontWeight: 'bold',
    justifyContent: 'center',
    textAlignVertical: 'center',
  },

  categoryOuter: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  emojiGroup: {
    marginBottom: EMOJI_GROUP_PADDING_BOTTOM,
    alignItems: 'center',
    flexWrap: 'wrap',
    flexDirection: 'row',
  },

  shortcutsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: PADDING,
  },

  shortcut: {
    padding: PADDING,
  },
});

class EmojiGroup extends PureComponent<{
  emojis: Array<string>;
  onEmojiSelected: (e: string) => void;
  emojiSize?: number;
  emojiStyle?: TextStyle;
  columns?: number;
}> {
  public render() {
    const emojis = this.props.emojis;
    const size = this.props.emojiSize || DEFAULT_EMOJI_SIZE;
    const style = {
      width: size,
      height: size,
      boxSizing: 'content-box',
      fontSize: size * 0.8,
      textAlign: 'center' as const,
      lineHeight: size,
      margin: PADDING,
    } as TextStyle;
    const cols = this.props.columns ?? 7;
    const maxWidth = (size + PADDING * 2) * cols + 2;
    const minWidth = maxWidth;

    return $(
      View,
      {style: [styles.emojiGroup, {minWidth, maxWidth}]},
      ...emojis
        .filter((e) => !!e)
        .map((e) =>
          $(
            Text,
            {
              style: [style, this.props.emojiStyle],
              key: e,
              onPress: () => this.props.onEmojiSelected(e),
            },
            e,
          ),
        ),
    );
  }
}

class EmojiCategory extends PureComponent<{
  category: string;
  emojisByCategory: Record<string, Array<string>>;
  onEmojiSelected: (e: string) => void;
  emojiSize?: number;
  emojiStyle?: TextStyle;
  columns?: number;
  headerStyle?: TextStyle;
  localizedCategories?: LocalizedCategories;
}> {
  public render() {
    const {
      onEmojiSelected,
      emojiSize,
      emojiStyle,
      columns,
      category,
      emojisByCategory,
      localizedCategories,
      headerStyle,
    } = this.props;

    const emojis = emojisByCategory[category];
    const categoryText = localizedCategories
      ? localizedCategories[CATEGORIES.indexOf(category)]
      : category;

    return $(
      View,
      {style: styles.categoryOuter},
      $(Text, {style: [styles.headerText, headerStyle]}, categoryText),
      $(EmojiGroup, {
        emojis,
        onEmojiSelected,
        emojiSize,
        emojiStyle,
        columns,
      }),
    );
  }
}

class SearchField extends PureComponent<{
  customStyle?: ViewStyle;
  iconColor?: any;
  onChanged: (str: string) => void;
}> {
  public render() {
    const {customStyle, iconColor, onChanged} = this.props;
    return $(
      View,
      {style: styles.searchContainer},
      $(Icon, {
        key: 'a',
        size: SEARCH_ICON_SIZE,
        style: styles.searchIcon,
        color: iconColor ?? '#bcbcbc',
        name: 'magnify',
      }),
      $(TextInput, {
        key: 'b',
        style: [styles.search, customStyle],
        onChangeText: onChanged,
        autoFocus: false,
        multiline: false,
        returnKeyType: 'search',
        underlineColorAndroid: 'transparent',
      }),
    );
  }
}

class CategoryShortcuts extends PureComponent<{
  show: boolean;
  activeCategory: string;
  iconColor?: any;
  activeIconColor?: any;
  onPressCategory?: (cat: string) => void;
}> {
  public render() {
    // Scroll doesn't work on react-native-web due to bad FlatList support
    if (Platform.OS === 'web') {
      return $(View, {style: styles.shortcutsContainer});
    }

    const {onPressCategory, iconColor, activeCategory, activeIconColor, show} =
      this.props;

    return $(
      View,
      {style: styles.shortcutsContainer},
      ...CATEGORIES.map((category) => {
        if (show) {
          return $(
            TouchableOpacity,
            {onPress: () => onPressCategory?.(category)},

            $(Icon, {
              key: category,
              size: SHORTCUT_SIZE,
              style: styles.shortcut,
              color:
                category === activeCategory
                  ? activeIconColor ?? '#0c0c0c'
                  : iconColor ?? '#bcbcbc',
              name: categoryToIcon(category),
            }),
          );
        } else {
          return $(Icon, {
            key: category,
            size: SHORTCUT_SIZE,
            style: styles.shortcut,
            name: categoryToIcon(category),
            color: 'transparent',
          });
        }
      }),
    );
  }
}

function normalize(str: string) {
  return str
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ +/g, '')
    .replace(/_+/g, ' ')
    .trim();
}

export default class EmojiModal extends PureComponent<
  {
    onEmojiSelected: (e: string | null) => void;
    onPressOutside?: () => void;
    columns?: number;
    localizedCategories?: LocalizedCategories;
    emojiSize?: number;
    emojiStyle?: TextStyle;
    modalStyle?: ViewStyle;
    backgroundStyle?: ViewStyle;
    containerStyle?: ViewStyle;
    scrollStyle?: ViewStyle;
    headerStyle?: TextStyle;
    searchStyle?: ViewStyle;
    shortcutColor?: any;
    activeShortcutColor?: any;
  },
  {
    searchResults: Array<string>;
    activeCategory: string;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {searchResults: [], activeCategory: CATEGORIES[0]};
    this.prepareEmojisByCategory();
    this.calculateLayouts(props);
  }

  private emojisByCategory: Record<string, Array<string>> = {};
  private filteredEmojis: Array<Emoji> = [];
  private layouts: Array<{length: number; offset: number; index: number}>;
  private readonly ref: RefObject<FlatList<unknown>> = createRef();
  private readonly viewabilityConfig = {
    minimumViewTime: 1,
    viewAreaCoveragePercentThreshold: 51,
  };

  private prepareEmojisByCategory() {
    const emojiDB = require('./emoji.json') as Array<Emoji>;
    const blocklistedEmojis = ['white_frowning_face', 'keycap_star', 'eject'];

    this.filteredEmojis = emojiDB.filter((emoji: Emoji) => {
      if (blocklistedEmojis.includes(emoji.short_name)) return false;
      if (Platform.OS === 'android') {
        const addedIn = parseFloat(emoji.added_in);
        if (Number.isNaN(addedIn)) return true;
        if (addedIn < 2) return true;
        if (addedIn === 2) return Platform.Version >= 23;
        if (addedIn <= 4) return Platform.Version >= 24;
        if (addedIn <= 5) return Platform.Version >= 26;
        if (addedIn <= 11) return Platform.Version >= 28;
        else return Platform.Version >= 29;
      } else {
        return true;
      }
    });

    const groupedEmojis = groupBy(
      this.filteredEmojis,
      (emoji: Emoji) => emoji.category,
    );

    this.emojisByCategory = mapValues(groupedEmojis, (group: Array<Emoji>) =>
      group.map(charFromEmojiObj),
    );
  }

  private calculateLayouts(props: EmojiModal['props']) {
    let heightsSoFar = 0;
    this.layouts = CATEGORIES.map((category, i) => {
      const numEmojis = this.emojisByCategory[category].length;
      const numColumns = props.columns ?? DEFAULT_COLUMNS;
      const emojiSize = props.emojiSize ?? DEFAULT_EMOJI_SIZE;
      const numRows = Math.ceil(numEmojis / numColumns);
      const headerHeight = 16 + 2 * PADDING;
      const offset = heightsSoFar;
      const rowHeight = emojiSize + 2 * PADDING;
      const bottomPadding = EMOJI_GROUP_PADDING_BOTTOM;
      const height = headerHeight + numRows * rowHeight + bottomPadding;
      heightsSoFar += height;
      return {length: height, offset, index: i};
    });
  }

  private renderItem = ({item}: any) => {
    const {searchResults} = this.state;
    if (searchResults.length > 0) {
      return $(EmojiGroup, {...this.props, emojis: searchResults});
    } else {
      const category = item;
      return $(EmojiCategory, {
        ...this.props,
        emojisByCategory: this.emojisByCategory,
        category,
        key: category,
      });
    }
  };

  private onSearchChanged = (input: string) => {
    if (input.length === 0) {
      if (this.state.searchResults.length > 0) {
        this.setState({searchResults: []});
      }
      return;
    }
    if (input.length < 2) {
      return;
    }

    const searchResults = this.filteredEmojis
      .map((emoji) => {
        const shortName = normalize(emoji.short_name);
        const query = normalize(input);
        const score =
          shortName === query
            ? 3
            : shortName.startsWith(query)
            ? 2
            : shortName.includes(query)
            ? 1
            : 0;
        emoji._score = score;
        return emoji;
      })
      .filter((emoji) => emoji._score > 0)
      .sort((a, b) => b._score - a._score)
      .map(charFromEmojiObj);

    if (searchResults.length === 0) searchResults.push('');

    this.setState({searchResults});
  };

  private onPressCategory = (category: string) => {
    // Scroll doesn't work on react-native-web due to bad FlatList support
    if (Platform.OS === 'web') return;

    const index = CATEGORIES.indexOf(category);
    if (index >= 0) {
      this.ref.current?.scrollToIndex({
        animated: true,
        index,
        viewPosition: 0,
        viewOffset: 0,
      });
    }
  };

  private onPressBackground = () => {
    this.props.onPressOutside?.();
  };

  getItemLayout = (data: Array<unknown> | null | undefined, index: number) => {
    if (data?.[0] === null) return {length: TOTAL_HEIGHT, offset: 0, index: 0};
    return this.layouts[index];
  };

  onViewableItemsChanged = ({viewableItems}: any) => {
    if (viewableItems.length === 0) return;
    const category = viewableItems[0].key;
    this.setState({activeCategory: category});
  };

  public render() {
    const {
      modalStyle,
      backgroundStyle,
      containerStyle,
      scrollStyle,
      searchStyle,
      shortcutColor,
      activeShortcutColor,
    } = this.props;
    const {searchResults, activeCategory} = this.state;

    return $(
      View,
      {style: [styles.modal, modalStyle]},
      $(
        View,
        {style: [styles.container, containerStyle]},
        $(SearchField, {
          customStyle: searchStyle,
          onChanged: this.onSearchChanged,
          iconColor: shortcutColor,
        }),
        $(
          View,
          {style: styles.scrollerContainer},
          $(FlatList, {
            ['ref' as any]: this.ref,
            data: searchResults.length > 0 ? [null] : CATEGORIES,
            horizontal: false,
            numColumns: 1,
            onEndReachedThreshold: Platform.OS === 'web' ? 1 : 1000,
            onScrollToIndexFailed: noop,
            style: [styles.scroller, scrollStyle],
            initialNumToRender: 1,
            maxToRenderPerBatch: 1,
            keyExtractor: (category) => category as string,
            getItemLayout: this.getItemLayout,
            onViewableItemsChanged: this.onViewableItemsChanged,
            viewabilityConfig: this.viewabilityConfig,
            renderItem: this.renderItem,
          }),
        ),
        $(CategoryShortcuts, {
          show: searchResults.length === 0,
          activeCategory: activeCategory,
          iconColor: shortcutColor,
          activeIconColor: activeShortcutColor,
          onPressCategory: this.onPressCategory,
        }),
      ),

      $(
        TouchableWithoutFeedback,
        {onPress: this.onPressBackground},
        $(View, {style: [styles.background, backgroundStyle]}),
      ),
    );
  }
}
