# 财富财运动态应期：具体几月几号

该项使用仓库已有的公历日干支计算器。文章正文/简断和卦气取候由作者及独立读者实际核定；每个应期侧车绑定源码对象及独立复读，日期作为独立动态字段而非写死在稿件中。

## 获取当前的具体日期

每次**新查询**传入应用当前真实月支和公历参考日期。若用户从亥月进入子月，需选子月对应稿，而非仅重算旧亥月的日期。没有外部提供实际月令时，不擅自按公历月推出传统月支。

```js
import { loadLibrary, createWealthFortunePreviewRepository } from './src/index.js';
import { readFile } from 'node:fs/promises';

const library = await loadLibrary();
const repo = createWealthFortunePreviewRepository({
  library,
  readJSON: async path => JSON.parse(await readFile(path, 'utf8'))
});
const result = await repo.getReading({
  primaryId: 6,
  movingLine: 1,
  monthBranch: '亥',           // 实际起卦月支，由调用方的历法提供
  referenceDate: '2026-11-28'  // 测试日；实际新查询传当前本地公历日期，或省略自动取今天
});
console.log(result.timing.slots.map(({ label, display }) => ({ label, display })));
```

本月余日优先，无候才找次月；不会把过去的日期列为新占的应期。可传 `endDate` 限制所问范围。每一事件通常展示最多两个实际匹配日，`dates`保留完整 ISO 公历日期、干支、日支，`selectedAsEventDate`为false，代表传统候选而非保证某日现实到账。

若查看已存档历史，显式传 `mode:'history'`、原起卦日 `castingDate`、原月支和当前 `referenceDate`，过期候标注已过，不篡改旧记录。重新占问才切换到当前月支与参考日。

## GitHub 预览日期刷新

在仓库根执行：

```sh
node scripts/review/wealth-fortune-monthly.mjs --build --index --as-of 2026-11-28
```

将 `--as-of` 替换为所需公历参考日（省略时新建预览采用当前本地日期）。所有已通过第二版及动态应期读审的稿件都会显示具体本月/下月几号；第一版尚未核定的时段不会凭空生成日期。核验命令不加 `--build` 时会采用 manifest 中保存的参考日重现提交文件。

## 取候及校验

《梅花易数》555–557行求财专条，655及968行时令、日应，803–804行体用衰旺；与已核对的每篇实际节点相绑定。生体/有力体克用可取见财候，体生用耗及直接克体取防耗/阻节候；体旺相环境为准备，不当作独立得财日。弱关系只在明确现有事项时取条件候。没有明确财候时只列蓄力或防耗，而不为了日期完整造出财日。

测试：`node --test tests/wealth-fortune-timing.test.mjs`。包含换月重新选稿、月内优先/下月兜底、问期结束日、旧记录过期、不匹配盘面角色及日期拒绝。正式产品入口仍未切换到预览文稿。

未发布或尚未具备正文及动态旁证的卦爻，查询入口返回 `requires-reviewed-preview`（缺档 ENOENT/404 同样如此），不构造未审内容。其他文件读取及解析异常仍抛出以便排查。
