// Broad wire feeds are not proof of regional relevance. These panels require
// a named place in the headline; this is a text match, not an analyst verdict.
const REGION_NAMES = {
    myanmarConflict: /\b(myanmar|burma|burmese|naypyidaw|yangon|mandalay|sagaing|kachin|kayin|myawaddy|mae sot)\b/i,
    southChinaSea: /\b(south china sea|philippines?|philippine|taiwan|taipei|spratly|paracel|scarborough|sierra madre|nine.dash)\b/i,
    aseanDiplomacy: /\b(asean|thailand|thai|singapore|malaysia|indonesia|vietnam|philippines|cambodia|laos|myanmar|brunei|timor.leste)\b/i,
    thaiSecurity: /\b(thailand|thai|bangkok|pattani|yala|narathiwat|mae sot|surin|sisaket)\b/i,
};

export function regionalBriefingItems(id, items = []) {
    const rule = REGION_NAMES[id];
    return { filtered: Boolean(rule), items: rule ? items.filter(item => rule.test(String(item?.title || ''))) : items };
}
