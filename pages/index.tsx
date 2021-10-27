import React, { useEffect, useState, Children } from 'react';
import { Calendar as BigCalendar, View, momentLocalizer } from 'react-big-calendar';
import moment, { Moment } from 'moment';
import { useFela } from 'react-fela';
import { RRule } from 'rrule';

import { Flex, HStack, VStack, SimpleGrid, Center, Box, Text, RadioGroup, Radio, Input, CheckboxGroup, Checkbox } from '@chakra-ui/react';
import { BiChevronLeft, BiChevronRight, BiLogOutCircle, BiCheck } from 'react-icons/bi';
import { DatePicker } from 'antd';

interface ICalendarProps {
  type: string;
  blockedEvents: any[];
  form: any;
  loading: boolean;
  handleAddScheduleEvent: Function;
  handleUpdateScheduleEvent: Function;
}

const localizer = momentLocalizer(moment);
const allViews: View[] = ['month', 'day', 'agenda'];
const defaultViewMode = "month";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const Hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const availableColor = "#3e9f31";
const partialColor = "#31679f";
const blockColor = "transparent"; // "#4f504f";

const { RangePicker } = DatePicker;

const rruleFreqMap = {
  yearly: RRule.YEARLY,
  monthly: RRule.MONTHLY,
  weekly: RRule.WEEKLY,
  daily: RRule.DAILY,
  hourly: RRule.HOURLY
}
const rruleWeekdayMap = {
  mon: RRule.MO,
  tue: RRule.TU,
  wed: RRule.WE,
  thu: RRule.TH,
  fri: RRule.FR,
  sat: RRule.SA,
  sun: RRule.SU
}

export default function Calendar({
  type,
  blockedEvents,
  form,
  loading,
  handleAddScheduleEvent,
  handleUpdateScheduleEvent,
}: ICalendarProps) {
  const { css } = useFela();
  const [calendarDate, setCalendarDate] = useState<Moment>(moment());
  const [viewMode, setViewMode] = useState<View>(defaultViewMode);
  const [blockEvents, setBlockEvents] = useState<any[]>([]);
  const [blockRepeatFrom, setBlockRepeatFrom] = useState<Moment>(moment(calendarDate).startOf('month'));
  const [blockRepeatTo, setBlockRepeatTo] = useState<Moment>(moment(calendarDate).endOf('month'));
  const [blockRepeatMonthFreq, setBlockRepeatMonthFreq] = useState("no"); // no, weekly, daily
  const [blockRepeatDayFreq, setBlockRepeatDayFreq] = useState("no"); // no, hourly
  const [blockRepeatInterval, setBlockRepeatInterval] = useState<number>(1);
  const [blockRepeatByWeekdays, setBlockRepeatByWeekdays] = useState([]); // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const [blockRepeatByHours, setBlockRepeatByHours] = useState([]); // [0, ..., 12, ..., 23]

  const [bookEvents, setBookEvents] = useState<any[]>([]);

  useEffect(() => {
    setBlockEvents(convertBlockEventsToDateType(blockedEvents))
  }, [blockedEvents]);

  const convertBlockEventsToDateType = (blockedEvents) => {
    return blockedEvents.map(e => ({
      start: moment(e.start).toDate(),
      end: moment(e.end).toDate(),
    }))
  }

  useEffect(() => {
    if (viewMode === "month" && blockRepeatMonthFreq === "no") return; // no repeat

    if (viewMode === "day" && blockRepeatDayFreq === "no") return; // no repeat
    if (viewMode === "day" && calendarDate.isBefore(moment())) return; //not available

    const repeatRule = new RRule({
      dtstart: moment(blockRepeatFrom).add(moment(blockRepeatFrom).utcOffset(), 'minutes').toDate(),
      until: moment(blockRepeatTo).add(moment(blockRepeatTo).utcOffset(), 'minutes').toDate(),
      freq: viewMode === "month" ? rruleFreqMap[blockRepeatMonthFreq] : rruleFreqMap[blockRepeatDayFreq],
      interval: blockRepeatInterval,
      byweekday: blockRepeatByWeekdays.length > 0 ? blockRepeatByWeekdays.map(e => rruleWeekdayMap[e]) : null,
      byhour: viewMode === "month" && blockRepeatByHours.length > 0 ? blockRepeatByHours : null,
      count: 10000, //result count, up to 
      wkst: RRule.MO //weekday start
    });

    // console.log(repeatRule.toString())
    // console.log(repeatRule.all())

    if (viewMode === "month") removeBlockedAllTimesOfMonth(calendarDate);
    else if (viewMode === "day") removeBlockedAllTimesOfDate(calendarDate);

    const blockRepeats = repeatRule.all();
    blockRepeats.map(e => {
      const reDateTime = moment(e).subtract(moment(e).utcOffset(), "minute").toDate(); // because rrule process utc time
      if (isUnavailableDate(reDateTime)) return;
      if (viewMode === "month" && blockRepeatByHours.length == 0) putBlockedAllTimesOfDate(reDateTime);
      else putBlockedTime(reDateTime);
    })

  }, [blockRepeatMonthFreq, blockRepeatDayFreq, blockRepeatInterval, blockRepeatByWeekdays, blockRepeatByHours]);

  useEffect(() => {
    console.log('blockEvents', blockEvents);
    console.log('bookEvents', bookEvents);
  }, [blockEvents, bookEvents]);

  useEffect(() => {
    setBlockRepeatFrom(moment(calendarDate).startOf(viewMode === "month" ? "month" : "day"));
    setBlockRepeatTo(moment(calendarDate).endOf(viewMode === "month" ? "month" : "day"));
    if (viewMode === "month") setBlockRepeatMonthFreq("no");
    else if (viewMode === "day") setBlockRepeatDayFreq("no");
  }, [calendarDate, viewMode]);


  const isUnavailableDate = (date) => {// before today and existing days in next month
    return moment(date).isBefore(moment()) || moment(date).isAfter(moment(calendarDate).endOf('month'));
  }
  const isBlockedTime = (date) => {
    return blockEvents.findIndex(e => moment(e.start).isSame(moment(date), "hour")) > -1;
  }
  const isBlockedPartialTimesOfDate = (date) => {
    const blockedTimeCount = blockEvents.filter(e => moment(e.start).isSame(moment(date), "date")).length;
    return blockedTimeCount > 0 && blockedTimeCount < 24;
  }
  const isBlockedAllTimesOfDate = (date) => {
    return blockEvents.filter(e => moment(e.start).isSame(moment(date), "date")).length == 24;
  }

  const isBookedTime = (date) => {
    return bookEvents.findIndex(e => moment(e.start).isSame(moment(date), "hour")) > -1;
  }
  const isBookedPartialTimesOfDate = (date) => {
    const bookedTimeCount = bookEvents.filter(e => moment(e.start).isSame(moment(date), "date")).length;
    return bookedTimeCount > 0 && bookedTimeCount < 24;
  }
  const isBookedAllTimesOfDate = (date) => {
    return bookEvents.filter(e => moment(e.start).isSame(moment(date), "date")).length == 24;
  }

  // const isBookedDate = (date) => {
  //   return bookEvents.findIndex(e => moment(e.start).isSame(moment(date), "date")) > -1;
  // }


  const putBlockedAllTimesOfDate = (date) => {
    let timeEvents = [];
    const startOfDate = moment(date).startOf("date");
    for (let hour = 0; hour < 24; hour++) {
      const start = moment(startOfDate).add(hour, "hour").toDate();
      const end = moment(start).endOf("hour").toDate();
      timeEvents.push({ start, end });
    }
    setBlockEvents(events => [...events, ...timeEvents]);
  }
  const putBlockedTime = (time) => {
    setBlockEvents(events => [...events, { start: time, end: moment(time).endOf("hour").toDate() }]);
  }
  const removeBlockedAllTimesOfMonth = (date) => {
    setBlockEvents(events => events.filter(e => !(moment(e.start).isSame(date, "month"))));
  }
  const removeBlockedAllTimesOfDate = (date) => {
    setBlockEvents(events => events.filter(e => !moment(e.start).isSame(moment(date), "date")));
  }
  const removeBlockedTime = (time) => {
    setBlockEvents(events => events.filter(e => !(moment(e.start).isSame(moment(time), "hour"))));
  }

  const isTimeExistedInBlocked = (time) => {
    return blockEvents.findIndex(e => moment(e.start).isSame(moment(time), "hour")) > -1;
  }
  const putBookedAllTimesOfDate = (date) => {
    let timeEvents = [];
    const startOfDate = moment(date).startOf("date");
    for (let hour = 0; hour < 24; hour++) {
      const start = moment(startOfDate).add(hour, "hour").toDate();
      const end = moment(start).endOf("hour").toDate();

      if (!isTimeExistedInBlocked(start)) timeEvents.push({ start, end });
    }
    setBookEvents(events => [...events, ...timeEvents]);
  }
  const putBookedTime = (time) => {
    setBookEvents(events => [...events, { start: time, end: moment(time).endOf("date").toDate() }]);
  }
  const removeBookedAllTimesOfDate = (date) => {
    setBookEvents(events => events.filter(e => !moment(e.start).isSame(moment(date), "date")));
  }
  const removeBookedTime = (time) => {
    setBookEvents(events => events.filter(e => !(moment(e.start).isSame(moment(time), "hour"))));
  }



  const handleBlockRepeatRange = (dateRange) => {
    setBlockRepeatFrom(dateRange[0]);
    setBlockRepeatTo(dateRange[1]);
  }

  const handleSelectSlot = ({ start, end }) => {// month: start=end, day: start+1hr=end
    // console.log(start, end)
    if (viewMode === "month" && start === end) { // date selection in month view      
      if (isUnavailableDate(start)) return;

      if (type === "host") {
        if (isBlockedAllTimesOfDate(start) || isBlockedPartialTimesOfDate(start)) removeBlockedAllTimesOfDate(start);
        else putBlockedAllTimesOfDate(start);
      }
      if (type === "guest") {
        if (isBookedAllTimesOfDate(start) || isBookedPartialTimesOfDate(start)) removeBookedAllTimesOfDate(start);
        else {
          if (isBlockedAllTimesOfDate(start)) return;
          putBookedAllTimesOfDate(start);
        }
      }
    }
    else if (viewMode === "day") {//time range selection in day view
      if (isUnavailableDate(start)) return;

      if (type === "host") {
        if (isBlockedTime(start)) removeBlockedTime(start);
        else putBlockedTime(start);
      }
      if (type === "guest") {
        if (isBookedTime(start)) removeBookedTime(start);
        else {
          if (isBlockedAllTimesOfDate(start)) return;
          if (isBlockedTime(start)) return;
          putBookedTime(start);
        }
      }
    }
  };

  const handleReset = () => {
    if (viewMode === "month") {
      removeBlockedAllTimesOfMonth(calendarDate);
      setBlockRepeatMonthFreq("no");
    }
    else if (viewMode === "day") {
      removeBlockedAllTimesOfDate(calendarDate);
      setBlockRepeatDayFreq("no");
    }
  }

  const handleClickHour = (hour) => {
    setBlockRepeatByHours(hours => hours.includes(hour) ? hours.filter(e => e != hour) : hours.concat([hour])) // toggle or push
  }

  const Toolbar = (toolbar) => {
    const goToBack = () => {
      let mDate = toolbar.date;
      let newDate = viewMode === "month" ? new Date(
        mDate.getFullYear(),
        mDate.getMonth() - 1,
        1
      ) : new Date(
        mDate.getFullYear(),
        mDate.getMonth(),
        mDate.getDate() - 1 // day view
      );
      toolbar.onNavigate('prev', newDate);
    }

    const goToNext = () => {
      let mDate = toolbar.date;
      let newDate = viewMode === "month" ? new Date(
        mDate.getFullYear(),
        mDate.getMonth() + 1,
        1
      ) : new Date(
        mDate.getFullYear(),
        mDate.getMonth(),
        mDate.getDate() + 1 // day view
      );
      toolbar.onNavigate('next', newDate);
    }

    return (
      <Flex w="100%" h="32px" justifyContent="space-between" alignItems="center">
        <BiChevronLeft onClick={goToBack} fontSize={28} cursor="pointer" />
        <Text>{moment(toolbar.date).format(viewMode === "month" ? "MMMM YYYY" : "ddd, MMM Do YYYY")}</Text>
        <HStack spacing={4}>
          {viewMode === "day" && <BiLogOutCircle onClick={() => toolbar.onView("month")} fontSize={24} cursor="pointer" />}
          <BiChevronRight onClick={goToNext} fontSize={28} cursor="pointer" />
        </HStack>
      </Flex>
    )
  }

  const CustomDateCellWrapper = (props) => {
    const { children, value } = props;

    const isUnavailable = isUnavailableDate(value);
    const isBlocked = isBlockedAllTimesOfDate(value);
    const isPartialBlocked = isBlockedPartialTimesOfDate(value);
    const isBooked = isBookedAllTimesOfDate(value) || isBookedPartialTimesOfDate(value);

    const DateCell = () => {
      return (
        <Center h="full">
          {
            isBooked && <BiCheck fontSize={22} />
          }
        </Center>
      )
    }

    return React.cloneElement(Children.only(children), {
      style: {
        ...children.style,
        backgroundColor: isUnavailable ? blockColor : isPartialBlocked ? partialColor : isBlocked ? blockColor : availableColor,
        cursor: isUnavailable ? 'not-allowed' : isBlocked && type === "guest" ? 'not-allowed' : '',
      }
    }, <DateCell />);
  }

  const CustomTimeCellWrapper = (props) => {
    const { children, value } = props;

    const isUnavailable = isUnavailableDate(value);
    const isBlocked = isBlockedTime(value);
    const isBooked = isBookedTime(value);

    const TimeCell = () => {
      return (
        <HStack px={4}>
          <Text w="full" fontSize="14px" color={isBlocked ? "darkgray" : "white"}>{moment(value).format("hh:mm A")}~{moment(value).add(1, "hour").format("hh:mm A")}</Text>
          {
            isBooked && <Center w="full"><BiCheck fontSize={20} color="white" /></Center>
          }
        </HStack>
      )
    }

    return React.cloneElement(Children.only(children), {
      style: {
        ...children.style,
        backgroundColor: (isUnavailable || isBlocked) ? blockColor : availableColor,
        cursor: isUnavailable ? 'not-allowed' : isBlocked && type === "guest" ? 'not-allowed' : '',
      }
    }, <TimeCell />);
  }

  const LegendBar = () => {
    const colors = [
      { name: "available", value: availableColor },
      { name: "partial", value: partialColor },
      { name: "block", value: blockColor }
    ];

    return (
      <HStack spacing={6}>
        {
          colors.map(color => (
            <HStack key={color.name} spacing={2}>
              <Box bgColor={color.value} w={6} h={4} border="1px solid darkgray"></Box>
              <Text textTransform="uppercase" fontSize="13px">{color.name}</Text>
            </HStack>
          ))
        }
      </HStack>
    )
  }

  const ControlPanel = () => {
    return (
      <Box maxW="350px" pt="32px">
        <LegendBar />

        <Text mt={8}>How to block repeatedly?</Text>
        {/* <Box className={css(stylesheet.antRP)} mt={4}>
          <RangePicker
            defaultValue={[blockRepeatFrom, blockRepeatTo]}
            onChange={handleBlockRepeatRange}
          />
        </Box> */}

        <Text mt={4}>From: {blockRepeatFrom.format("ddd, MMM DD YYYY HH:mm:ss")}</Text>
        <Text mt={4}>To:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {blockRepeatTo.format("ddd, MMM DD YYYY HH:mm:ss")}</Text>

        <RadioGroup value={viewMode === "month" ? blockRepeatMonthFreq : blockRepeatDayFreq} onChange={(value) => viewMode === "month" ? setBlockRepeatMonthFreq(value) : setBlockRepeatDayFreq(value)} mt={4}>
          <VStack align="start">
            {
              viewMode === "month" &&
              <>
                <Radio value="no">No Repeat <Text display="inline" fontSize="13px" textDecoration="underline" _hover={{ color: availableColor }} onClick={handleReset}>[ Reset ]</Text></Radio>
                <Radio value="weekly">Weekly</Radio>
                <Radio value="daily">Daily</Radio>
              </>
            }
            {
              viewMode === "day" &&
              <>
                <Radio value="no">No Repeat <Text display="inline" fontSize="13px" textDecoration="underline" _hover={{ color: availableColor }} onClick={handleReset}>[ Reset ]</Text></Radio>
                <Radio value="hourly">Hourly</Radio>
              </>
            }
          </VStack>
        </RadioGroup>
        <HStack spacing={2} mt={4}>
          <Text>Interval: </Text>
          <Input
            value={blockRepeatInterval}
            onChange={(e) => setBlockRepeatInterval(Number(e.target.value))}
            type="number"
            min={1}
            focusBorderColor="none"
            _hover={{ borderColor: "none" }}
            borderColor="white"
            borderRadius={0}
            h="32px"
          />
        </HStack>
        {
          viewMode === "month" &&
          <HStack spacing={4} mt={4}>
            <Text mr="6px">By weekday: </Text>
            <CheckboxGroup value={blockRepeatByWeekdays} onChange={(value) => setBlockRepeatByWeekdays(value)}>
              <SimpleGrid columns={2} columnGap={4} rowGap={2}>
                {
                  DAYS.map((day) => (
                    <Checkbox key={day} value={day} textTransform="capitalize" _focus={{ boxShadow: "none" }}>{day}</Checkbox>
                  ))
                }
              </SimpleGrid>
            </CheckboxGroup>
          </HStack>
        }
        {
          viewMode === "month" &&
          <HStack spacing={4} mt={4}>
            <Text>By hour(~1h): </Text>
            <SimpleGrid columns={3} columnGap={4} rowGap={2}>
              {
                Hours.map((hour) => (
                  <Center
                    key={hour}
                    bgColor={blockRepeatByHours.includes(hour) ? "darkgray" : "transparent"}
                    border="2px solid #34394c"
                    borderRadius="2px"
                    px="1px"
                    cursor="pointer"
                    onClick={() => handleClickHour(hour)}
                  >
                    {moment().hour(hour).minute(0).format("hh:mm A")}
                  </Center>
                ))
              }
            </SimpleGrid>
          </HStack>
        }
      </Box>
    )
  }

  return (
    <Box>
      <HStack spacing={6} align="start">
        <BigCalendar
          selectable
          localizer={localizer}
          events={blockEvents}
          views={allViews}
          defaultDate={new Date()}
          defaultView={defaultViewMode}
          drilldownView="day"
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          timeslots={1}
          step={60}
          toolbar
          onView={(view) => setViewMode(view)}
          onSelectEvent={handleSelectSlot}
          onSelectSlot={handleSelectSlot}
          onSelecting={() => false}
          onNavigate={(date) => setCalendarDate(moment(date))}
          components={{
            toolbar: Toolbar,
            dateCellWrapper: CustomDateCellWrapper,
            timeSlotWrapper: CustomTimeCellWrapper,
          }}
          style={{ width: type === "host" ? 600 : "100%", height: viewMode === "month" ? 500 : 'auto' }}
          className={css(
            stylesheet.rbc,
            stylesheet.rbcDateEventHide,
            stylesheet.rbcTimeSlot,
            stylesheet.rbcTimeHeaderGutterHide,
          )}
        />
        {
          type === "host" && <ControlPanel />
        }
      </HStack>
      {
        type === "guest" && <Center mt={4}><LegendBar /></Center>
      }
    </Box>
  );
}


const stylesheet: any = {
  rbc: {
    '& .rbc-off-range-bg': {
      opacity: 0,
      cursor: "not-allowed"
    },
    '& .rbc-date-cell.rbc-off-range': {
      visibility: "hidden"
    },
    '& .rbc-events-container': {
      margin: '0px',
    },
    '& .rbc-today': {
      backgroundColor: 'transparent'
    },
    '& .chakra-icon': {
      cursor: "pointer"
    }
  },
  rbcDateEventHide: {
    '& .rbc-event': {
      display: 'none'
    },
    '& .rbc-events-container': {
      display: 'none'
    }
  },
  rbcTimeSlot: {
    '& .rbc-timeslot-group': {
      height: 25,
      minHeight: 25
    }
  },
  rbcTimeHeaderGutterHide: {
    '& .rbc-time-header': {
      display: 'none'
    },
    '& .rbc-time-gutter': {
      display: 'none'
    }
  },

  antRP: {
    '& .ant-picker': {
      background: "transparent",
      boxShadow: "none",
      borderRadius: "0px"
    },
    '& .ant-picker:hover': {
      borderColor: "white !important"
    },
    '& .ant-picker-focused': {
      borderColor: "white !important"
    },
    '& .ant-picker-range-separator': {
      visibility: "hidden"
    },
    '& .ant-picker-suffix': {
      color: 'white'
    },
    '& .ant-picker-input > input': {
      color: 'white'
    }
  }
};