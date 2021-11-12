import { useEffect } from "react";
import convertToRange from "convert-to-ranges";
import rangeParser from "parse-numeric-range";

import moment from 'moment';
import * as Moment from 'moment';
import { extendMoment as rangeExtendMoment, MomentRange, DateRange } from 'moment-range';
import { extendMoment as rangesExtendMoment, MomentRanges, DateRanges } from 'moment-ranges';

const momentRange: MomentRange = rangeExtendMoment(Moment);
const momentRanges: MomentRanges = rangesExtendMoment(Moment);

const Other = () => {
  useEffect(() => {
    const blockRule = "DTSTART:20211001T000000Z<br>RRULE:UNTIL=20211231T235959Z;FREQ=YEARLY;INTERVAL=1;BYMONTHDAY=29,30;COUNT=10000;WKST=MO";

    const blockStartExp = /DTSTART:([^T]+)/;
    const blockStart = blockStartExp.exec(blockRule) ? blockStartExp.exec(blockRule)[1] : null; //20211020
    const blockEndExp = /UNTIL=([^T]+)/;
    const blockEnd = blockEndExp.exec(blockRule) ? blockEndExp.exec(blockRule)[1] : null;
    const blockFreqExp = /FREQ=([^;]+)/;
    const blockFreq = blockFreqExp.exec(blockRule) ? blockFreqExp.exec(blockRule)[1] : null; //WEEKLY
    const blockByMonthExp = /BYMONTH=([^;]+)/;
    const blockByMonth = blockByMonthExp.exec(blockRule) ? blockByMonthExp.exec(blockRule)[1] : null; //1,2
    const blockByMonthDayExp = /BYMONTHDAY=([^;]+)/;
    const blockByMonthDay = blockByMonthDayExp.exec(blockRule) ? blockByMonthDayExp.exec(blockRule)[1] : null; //28,31
    const blockByDayExp = /BYDAY=([^;]+)/;
    const blockByDay = blockByDayExp.exec(blockRule) ? blockByDayExp.exec(blockRule)[1] : null; //MO,TU,WE
    const blockByHourExp = /BYHOUR=([^]+)/;
    const blockByHour = blockByHourExp.exec(blockRule) ? blockByHourExp.exec(blockRule)[1] : null; //2,4

    // console.log("block start", blockStart, "block end", blockEnd);
    // console.log("block freq", blockFreq);
    // console.log("block by month", blockByMonth);
    // console.log("block by month day", blockByMonthDay);
    // console.log("block by week day", blockByDay);
    // console.log("block by hour", blockByHour);

    // const searchFrom = new Date('02 October 2021 14:48 UTC').toISOString().replace(new RegExp("-", "g"), "").split("T")[0];
    // const searchTo = new Date('20 November 2021 14:48 UTC').toISOString().replace(new RegExp("-", "g"), "").split("T")[0];

    // const isBetweenBlock = blockStart <= searchFrom && searchTo <= blockEnd;
    // const isDailyBlock = blockFreq === "DAILY";
    // const isBlockByHour = blockByHour ? true : false;
    // console.log('is completely block?', isBetweenBlock && (!isBlockByHour || isDailyBlock));
  }, [])

  useEffect(() => {
    console.log(rangeParser("1,3,5,7-11,20-23"));
    console.log(convertToRange([1, 3, 5, 7, 8, 9, 10, 11, 20, 21, 22, 23]));
  }, [])

  useEffect(() => {
    const moment_a = new Date(2009, 1, 8);
    const moment_c = new Date(2012, 3, 7);
    const range_ac = momentRange.range(moment_a, moment_c);

    const moment_b = new Date(2012, 0, 15);
    const moment_d = new Date(2012, 4, 23);
    const range_bd = momentRange.range(moment_b, moment_d);

    // console.log("range_ac", range_ac);
    // console.log("range_bd", range_bd);

    const moment_e = new Date(2019, 10, 26, 5, 23, 45);
    const moment_f = new Date(2019, 10, 26, 7, 10, 30);
    const range_ef = momentRange.range(moment_e, moment_f);

    const moment_g = new Date(2019, 10, 26, 6, 23, 45);
    const moment_h = new Date(2019, 10, 26, 8, 10, 30);
    const range_gh = momentRange.range(moment_g, moment_h);

    const ranges_af = momentRanges.ranges(range_ac, range_bd, range_ef);
    const ranges_eh = momentRanges.ranges(range_ef, range_gh);
    // => DateRanges [moment.range(moment_a, moment_d), moment.range(moment_e, moment_f)]
    console.log("range_ef", range_ef);
    console.log("ranges_af", ranges_af);
    // console.log("ranges_eh", ranges_eh);

    // console.log("range duration more than 3 month", ranges.filter(range=>range > moment.duration(3, 'months')))

    const dates = [moment('2011-04-15', 'YYYY-MM-DD'), moment('2011-06-27', 'YYYY-MM-DD')];
    const range = momentRange.range(dates[0], dates[1]);
    const dates1 = [moment('2011-06-15', 'YYYY-MM-DD'), moment('2011-12-27', 'YYYY-MM-DD')];
    const range1 = momentRange.range(dates1[0], dates1[1]);
    const ranges = momentRanges.ranges(range, range1);

    const range2 = momentRange.range(moment('2011-12-28'), moment('2011-12-31'))
    // const range3 = momentRange.range(moment('2012-01-28'), moment('2012-02-28'))
    const range4 = momentRange.range(moment('2012-02-18T00:00:00'), moment('2012-02-18T05:05:45'))
    const range5 = momentRange.range(moment('2012-02-18T04:00:00'), moment('2012-02-18T07:03:23'))
    // const ranges1 = momentRanges.ranges(ranges.map(range => range), range2, range4, range5)

    console.log("range", range)
    console.log("range1", range1)
    console.log('ranges', ranges);
    // console.log('ranges1', ranges1);

    // console.log("empty split", "".split(","))
    // console.log("passing empty to range", momentRange.range(""))
    // console.log("moment(null)", moment(null))

  }, [])

  return <div>
    other page
  </div>
}

export default Other;