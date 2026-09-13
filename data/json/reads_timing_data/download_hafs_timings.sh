#!/usr/bin/env bash
set -u

BASE_URL="https://www.mp3quran.net/api/v3/ayat_timing"
READS_FILE="ayat_timing_reads_hafs_114_only.json"
OUT_DIR="timings_hafs_114"

mkdir -p "$OUT_DIR"

if [ ! -f "$READS_FILE" ]; then
  echo "❌ الملف غير موجود: $READS_FILE"
  echo "شغل أولاً فلترة القراء واحفظ الملف."
  exit 1
fi

READS_COUNT="$(jq 'length' "$READS_FILE")"

echo "عدد قراء حفص الكاملين: $READS_COUNT"
echo "سيتم إنشاء الملفات داخل: $OUT_DIR"
echo

for surah in $(seq 1 114); do
  surah_padded="$(printf "%03d" "$surah")"
  out_file="$OUT_DIR/timing_${surah_padded}.json"
  tmp_file="$OUT_DIR/timing_${surah_padded}.tmp.json"

  echo "📖 تحميل توقيتات السورة $surah_padded ..."

  echo "[]" > "$tmp_file"

  jq -c '.[]' "$READS_FILE" | while read -r read_item; do
    read_id="$(echo "$read_item" | jq -r '.id')"
    read_name="$(echo "$read_item" | jq -r '.name')"
    rewaya="$(echo "$read_item" | jq -r '.rewaya')"
    folder_url="$(echo "$read_item" | jq -r '.folder_url')"

    timing_url="${BASE_URL}?surah=${surah}&read=${read_id}"

    timing_data="$(curl -L -s --fail "$timing_url" || echo "[]")"

    # إذا الرد ليس JSON Array صالح، خله فاضي
    if ! echo "$timing_data" | jq -e 'type == "array"' >/dev/null 2>&1; then
      timing_data="[]"
    fi

    item="$(
      jq -n \
        --argjson read_id "$read_id" \
        --arg read_name "$read_name" \
        --arg rewaya "$rewaya" \
        --arg folder_url "$folder_url" \
        --argjson surah "$surah" \
        --arg timing_url "$timing_url" \
        --argjson ayat "$timing_data" \
        '{
          read_id: $read_id,
          read_name: $read_name,
          rewaya: $rewaya,
          folder_url: $folder_url,
          surah: $surah,
          timing_url: $timing_url,
          ayat_count: ($ayat | length),
          ayat_timing: $ayat
        }'
    )"

    jq --argjson item "$item" '. + [$item]' "$tmp_file" > "$tmp_file.next"
    mv "$tmp_file.next" "$tmp_file"

    echo "  ✅ read=$read_id | $read_name | ayat=$(echo "$timing_data" | jq 'length')"

    # تهدئة بسيطة حتى لا تضغط على السيرفر
    sleep 0.15
  done

  jq \
    --argjson surah "$surah" \
    --arg surah_padded "$surah_padded" \
    --argjson reads_count "$READS_COUNT" \
    '{
      surah: $surah,
      surah_padded: $surah_padded,
      rewaya: "حفص عن عاصم",
      reads_count: $reads_count,
      reads: .
    }' "$tmp_file" > "$out_file"

  rm -f "$tmp_file"

  echo "✅ تم إنشاء: $out_file"
  echo
done

echo "🎉 انتهى التحميل."
echo "عدد الملفات:"
ls "$OUT_DIR"/timing_*.json | wc -l