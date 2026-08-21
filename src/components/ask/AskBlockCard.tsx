import { Fragment } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type { AskAccent, AskBlock, AskItem, AskTableBlock } from '@/types';

const FIRST_COLUMN_WIDTH = 150;
const COLUMN_WIDTH = 118;
const NUMBER_COLUMN_WIDTH = 96;

const columnWidth = (index: number, last: number) =>
  index === 0
    ? FIRST_COLUMN_WIDTH
    : index === last
      ? NUMBER_COLUMN_WIDTH
      : COLUMN_WIDTH;

/**
 * Every value arrives pre-formatted from the agent, so this is layout only:
 * a header/total strip, then either list items or a table. Tables keep fixed
 * column widths and scroll sideways rather than squeezing columns off-screen.
 */
export const AskBlockCard = ({ block }: { block: AskBlock }) => {
  const styles = useThemedStyles(makeAskTraydStyles);

  const accentText = (accent: AskAccent | null | undefined) =>
    accent === 'danger'
      ? styles.textDanger
      : accent === 'warn'
        ? styles.textWarn
        : null;

  const head =
    block.header || block.total ? (
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel} numberOfLines={2}>
          {(block.header ?? '').toUpperCase()}
        </Text>
        {block.total ? (
          <Text style={styles.cardTotal}>{block.total}</Text>
        ) : null}
      </View>
    ) : null;

  if (block.type === 'table') {
    const table = block as AskTableBlock;
    const last = table.columns.length - 1;
    return (
      <View style={styles.card}>
        {head}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.tableScroll}
          persistentScrollbar
        >
          <View>
            <View style={styles.divider} />
            <View style={[styles.tableRow, styles.tableHeadRow]}>
              {table.columns.map((column, i) => (
                <Text
                  key={`${column}-${i}`}
                  style={[
                    styles.th,
                    { width: columnWidth(i, last) },
                    i === last && styles.tdNum,
                  ]}
                  numberOfLines={1}
                >
                  {column.toUpperCase()}
                </Text>
              ))}
            </View>
            {table.rows.map((row, ri) => {
              const accent = accentText(table.accents?.[ri]);
              return (
                <Fragment key={`row-${ri}`}>
                  <View style={styles.divider} />
                  <View style={[styles.tableRow, styles.tableBodyRow]}>
                    {row.map((cell, ci) => (
                      <Text
                        key={`cell-${ri}-${ci}`}
                        style={[
                          styles.td,
                          { width: columnWidth(ci, last) },
                          ci === 0 && styles.tdFirst,
                          ci === last && styles.tdNum,
                          accent,
                        ]}
                        numberOfLines={2}
                      >
                        {cell ?? ''}
                      </Text>
                    ))}
                  </View>
                </Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {head}
      {block.items.map((item: AskItem, i) => {
        const accent = accentText(item.accent);
        return (
          <Fragment key={`item-${i}`}>
            <View style={styles.divider} />
            <View style={styles.itemRow}>
              <View style={styles.itemBody}>
                <View style={styles.itemTitleRow}>
                  {item.accent ? (
                    <View
                      style={[
                        styles.dot,
                        item.accent === 'danger'
                          ? styles.dotDanger
                          : styles.dotWarn,
                      ]}
                    />
                  ) : null}
                  <Text style={[styles.itemTitle, accent]} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                {item.subtitle ? (
                  <Text style={[styles.itemSubtitle, accent]} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {item.amount ? (
                <Text style={[styles.itemAmount, accent]}>{item.amount}</Text>
              ) : null}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
};

export default AskBlockCard;
