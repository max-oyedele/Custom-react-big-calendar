import React, { Fragment, useEffect, useState, Children } from "react";
import {
  Calendar as BigCalendar,
  View,
  momentLocalizer,
} from "react-big-calendar";
import moment, { Moment } from "moment";
import { useFela } from "react-fela";
import { RRule } from "rrule";

import {
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Center,
  Box,
  Text,
  RadioGroup,
  Radio,
  Input,
  CheckboxGroup,
  Checkbox,
} from "@chakra-ui/react";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "@chakra-ui/icons";

const localizer = momentLocalizer(moment);
const allViews: View[] = ["month", "day", "agenda"];
const defaultViewMode = "month";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const Hours = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23,
];

const onColor = "#3e9f31";
const midColor = "#31679f";
const offColor = "#4f504f";

const rruleFreqMap = {
  yearly: RRule.YEARLY,
  monthly: RRule.MONTHLY,
  weekly: RRule.WEEKLY,
  daily: RRule.DAILY,
  hourly: RRule.HOURLY,
};
const rruleWeekdayMap = {
  mon: RRule.MO,
  tue: RRule.TU,
  wed: RRule.WE,
  thu: RRule.TH,
  fri: RRule.FR,
  sat: RRule.SA,
  sun: RRule.SU,
};

export default function Calendar() {
  const { css } = useFela();
  const [calendarDate, setCalendarDate] = useState<Moment>(moment());
  const [viewMode, setViewMode] = useState<View>(defaultViewMode);
  const [blockEvents, setBlockEvents] = useState<any[]>([]);
  const [blockRepeatFrom, setBlockRepeatFrom] = useState<Moment>(
    moment(calendarDate).startOf("month")
  );
  const [blockRepeatTo, setBlockRepeatTo] = useState<Moment>(
    moment(calendarDate).endOf("month")
  );
  const [blockRepeatMonthFreq, setBlockRepeatMonthFreq] = useState("no"); // no, weekly, daily
  const [blockRepeatDayFreq, setBlockRepeatDayFreq] = useState("no"); // no, hourly
  const [blockRepeatInterval, setBlockRepeatInterval] = useState<number>(1);
  const [blockRepeatByWeekdays, setBlockRepeatByWeekdays] = useState([]); // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const [blockRepeatByHours, setBlockRepeatByHours] = useState([]); // [0, ..., 12, ..., 23]

  useEffect(() => {
    if (viewMode === "month" && blockRepeatMonthFreq === "no") return; // no repeat

    if (viewMode === "day" && blockRepeatDayFreq === "no") return; // no repeat
    if (viewMode === "day" && calendarDate.isBefore(moment())) return; //not available
    if (viewMode === "day" && isBlockedDate(calendarDate)) return; //already blocked date

    const repeatRule = new RRule({
      dtstart: moment(blockRepeatFrom)
        .add(moment(blockRepeatFrom).utcOffset(), "minutes")
        .toDate(),
      until: moment(blockRepeatTo)
        .add(moment(blockRepeatTo).utcOffset(), "minutes")
        .toDate(),
      freq:
        viewMode === "month"
          ? rruleFreqMap[blockRepeatMonthFreq]
          : rruleFreqMap[blockRepeatDayFreq],
      interval: blockRepeatInterval,
      byweekday:
        blockRepeatByWeekdays.length > 0
          ? blockRepeatByWeekdays.map((e) => rruleWeekdayMap[e])
          : null,
      byhour:
        viewMode === "month" && blockRepeatByHours.length > 0
          ? blockRepeatByHours
          : null,
      count: 10000, //result count, up to
      wkst: RRule.MO, //weekday start
    });

    // console.log(repeatRule.toString())
    // console.log(repeatRule.all())

    const blockRepeats = repeatRule.all();
    setBlockEvents(
      blockRepeats.map((e) => {
        if (viewMode === "month") {
          return {
            type: blockRepeatByHours.length > 0 ? "time" : "date",
            start: moment(e)
              .subtract(moment(e).utcOffset(), "minutes")
              .toDate(),
            end: moment(e)
              .subtract(moment(e).utcOffset(), "minutes")
              .endOf(blockRepeatByHours.length > 0 ? "hour" : "date")
              .toDate(),
          };
        } else if (viewMode === "day") {
          return {
            type: "time",
            start: moment(e)
              .subtract(moment(e).utcOffset(), "minutes")
              .toDate(),
            end: moment(e)
              .subtract(moment(e).utcOffset(), "minutes")
              .endOf("hour")
              .toDate(),
          };
        }
      })
    );
  }, [
    blockRepeatMonthFreq,
    blockRepeatDayFreq,
    blockRepeatInterval,
    blockRepeatByWeekdays,
    blockRepeatByHours,
  ]);

  useEffect(() => {
    console.log(blockEvents);
    if (viewMode === "day" && isBlockedDateBy24Hours(calendarDate)) {
      setBlockEvents((events) =>
        events.filter(
          (e) =>
            !(
              e.type === "time" &&
              moment(e.start).isSame(moment(calendarDate), "date")
            )
        )
      );
      setBlockEvents((events) => [
        ...events,
        {
          type: "date",
          start: calendarDate.toDate(),
          end: moment(calendarDate).endOf("date").toDate(),
        },
      ]);
    }
  }, [blockEvents]);

  useEffect(() => {
    setBlockRepeatFrom(
      moment(calendarDate).startOf(viewMode === "month" ? "month" : "day")
    );
    setBlockRepeatTo(
      moment(calendarDate).endOf(viewMode === "month" ? "month" : "day")
    );
  }, [calendarDate, viewMode]);

  const onBlockRepeatRange = (dateRange) => {
    setBlockRepeatFrom(dateRange[0]);
    setBlockRepeatTo(dateRange[1]);
  };

  const isUnavailable = (date) => {
    // before today and existing days in next month
    return (
      moment(date).isBefore(moment()) ||
      moment(date).isAfter(moment(calendarDate).endOf("month"))
    );
  };
  const isBlockedDate = (date) => {
    return (
      blockEvents.findIndex(
        (e) => e.type === "date" && moment(e.start).isSame(moment(date), "date")
      ) > -1
    );
  };
  const isBlockedTime = (date) => {
    return (
      blockEvents.findIndex(
        (e) => e.type === "time" && moment(e.start).isSame(moment(date), "hour")
      ) > -1
    );
  };
  const isPartialBlockedDate = (date) => {
    const blockedTimeCount = blockEvents.filter(
      (e) => e.type === "time" && moment(e.start).isSame(moment(date), "date")
    ).length;
    return blockedTimeCount > 0 && blockedTimeCount < 24;
  };
  const isBlockedDateBy24Hours = (date) => {
    return (
      blockEvents.filter(
        (e) => e.type === "time" && moment(e.start).isSame(moment(date), "date")
      ).length == 24
    );
  };

  const handleChangeView = (view) => {
    //default setting
    if (view === "month") setBlockRepeatMonthFreq("no");
    else if (view === "day") setBlockRepeatDayFreq("no");

    setViewMode(view);
  };

  const handleSelectSlot = ({ start, end }) => {
    // month: start=end, day: start+1hr=end
    if (viewMode === "month" || start === end) {
      // date selection in month view
      if (isUnavailable(start)) return;

      if (isBlockedDate(start) || isPartialBlockedDate(start)) {
        setBlockEvents((events) =>
          events.filter((e) => !moment(e.start).isSame(moment(start), "date"))
        ); // remove blocked date and times
      } else {
        setBlockEvents((events) => [
          ...events,
          {
            type: "date",
            start: start,
            end: moment(end).endOf("date").toDate(),
          },
        ]); //blocked date events
      }
    } else {
      //time range selection in day view
      if (isUnavailable(start)) return;
      if (isBlockedDate(start)) return;

      if (isBlockedTime(start)) {
        setBlockEvents((events) =>
          events.filter(
            (e) =>
              !(
                e.type === "time" &&
                moment(e.start).isSame(moment(start), "hour")
              )
          )
        ); //remove blocked time
      } else {
        setBlockEvents((events) => [
          ...events,
          {
            type: "time",
            start: start,
            end: moment(start).endOf("hour").toDate(),
          },
        ]); //blocked time
      }
    }
  };

  const handleReset = () => {
    if (viewMode === "month") {
      setBlockEvents((events) =>
        events.filter((e) => moment(e.start).month() !== calendarDate.month())
      );
      setBlockRepeatMonthFreq("no");
    } else if (viewMode === "day") {
      setBlockEvents((events) =>
        events.filter((e) => moment(e.start).date() != calendarDate.date())
      );
      setBlockRepeatDayFreq("no");
    }
  };

  const handleClickHour = (hour) => {
    setBlockRepeatByHours((hours) =>
      hours.includes(hour)
        ? hours.filter((e) => e != hour)
        : hours.concat([hour])
    ); // toggle or push
  };

  const Toolbar = (toolbar) => {
    const goToBack = () => {
      let mDate = toolbar.date;
      let newDate =
        viewMode === "month"
          ? new Date(mDate.getFullYear(), mDate.getMonth() - 1, 1)
          : new Date(
              mDate.getFullYear(),
              mDate.getMonth(),
              mDate.getDate() - 1 // day view
            );
      toolbar.onNavigate("prev", newDate);
    };

    const goToNext = () => {
      let mDate = toolbar.date;
      let newDate =
        viewMode === "month"
          ? new Date(mDate.getFullYear(), mDate.getMonth() + 1, 1)
          : new Date(
              mDate.getFullYear(),
              mDate.getMonth(),
              mDate.getDate() + 1 // day view
            );
      toolbar.onNavigate("next", newDate);
    };

    return (
      <Flex
        w="600px"
        h="32px"
        justifyContent="space-between"
        alignItems="center"
      >
        <ArrowLeftIcon onClick={goToBack} />
        <Text>
          {moment(toolbar.date).format(
            viewMode === "month" ? "MMMM YYYY" : "ddd, MMM Do YYYY"
          )}
        </Text>
        <HStack spacing={4}>
          {viewMode === "day" && (
            <CloseIcon onClick={() => toolbar.onView("month")} />
          )}
          <ArrowRightIcon onClick={goToNext} />
        </HStack>
      </Flex>
    );
  };

  const ColoredDateCellWrapper = (props) => {
    const { children, value, blockEvents } = props;

    const isOff = isUnavailable(value);
    const isBlocked = isBlockedDate(value);
    const isMid = isPartialBlockedDate(value);

    return React.cloneElement(Children.only(children), {
      style: {
        ...children.style,
        backgroundColor: isOff
          ? offColor
          : isMid
          ? midColor
          : isBlocked
          ? offColor
          : onColor,
        cursor: isOff ? "not-allowed" : "",
      },
    });
  };

  const ControlPanel = () => {
    const colors = [
      { name: "available", value: onColor },
      { name: "partial", value: midColor },
      { name: "block", value: offColor },
    ];

    return (
      <Box pt="32px">
        <HStack spacing={6}>
          {colors.map((color) => (
            <HStack key={color.name} spacing={2}>
              <Box bgColor={color.value} w={6} h={4}></Box>
              <Text textTransform="uppercase" fontSize="13px">
                {color.name}
              </Text>
            </HStack>
          ))}
        </HStack>

        <Text mt={8}>How to block repeatedly?</Text>

        <Text mt={4}>
          From: {blockRepeatFrom.format("ddd, MMM DD YYYY HH:mm:ss")}
        </Text>
        <Text mt={4}>
          To:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
          {blockRepeatTo.format("ddd, MMM DD YYYY HH:mm:ss")}
        </Text>

        <RadioGroup
          value={
            viewMode === "month" ? blockRepeatMonthFreq : blockRepeatDayFreq
          }
          onChange={(value) =>
            viewMode === "month"
              ? setBlockRepeatMonthFreq(value)
              : setBlockRepeatDayFreq(value)
          }
          mt={4}
        >
          <VStack align="start">
            {
              viewMode === "month" &&
              <>
                <Radio value="no" borderColor="gray.600">No Repeat <Text display="inline" fontSize="13px" textDecoration="underline" _hover={{ color: onColor }} onClick={handleReset}>[ Reset ]</Text></Radio>
                <Radio value="weekly" borderColor="gray.600">Weekly</Radio>
                <Radio value="daily" borderColor="gray.600">Daily</Radio>
              </>
            }
            {
              viewMode === "day" &&
              <>
                <Radio value="no" borderColor="gray.600">No Repeat <Text display="inline" fontSize="13px" textDecoration="underline" _hover={{ color: onColor }} onClick={handleReset}>[ Reset ]</Text></Radio>
                <Radio value="hourly" borderColor="gray.600">Hourly</Radio>
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
            borderColor="gray.600"
            borderRadius="2px"
            h="32px"
          />
        </HStack>
        {viewMode === "month" && (
          <HStack spacing={4} mt={4}>
            <Text mr="6px">By weekday: </Text>
            {/* <CheckboxGroup
              value={blockRepeatByWeekdays}
              onChange={(value) => setBlockRepeatByWeekdays(value)}
            >
              <SimpleGrid columns={2} columnGap={4} rowGap={2}>
                {DAYS.map((day) => (
                  <Checkbox
                    key={day}
                    value={day}
                    textTransform="capitalize"
                    _focus={{ boxShadow: "none" }}
                    borderColor="gray.600"
                  >
                    {day}
                  </Checkbox>
                ))}
              </SimpleGrid>
            </CheckboxGroup> */}
          </HStack>
        )}
        {viewMode === "month" && (
          <HStack spacing={4} mt={4}>
            <Text>By hour(~1h): </Text>
            <SimpleGrid columns={3} columnGap={4} rowGap={2}>
              {Hours.map((hour) => (
                <Center
                  key={hour}
                  bgColor={
                    blockRepeatByHours.includes(hour) ? offColor : "transparent"
                  }
                  border="2px"
                  borderColor="gray.600"
                  borderRadius="2px"
                  px="1px"
                  cursor="pointer"
                  onClick={() => handleClickHour(hour)}
                >
                  {moment().hour(hour).minute(0).format("hh:mm A")}
                </Center>
              ))}
            </SimpleGrid>
          </HStack>
        )}
      </Box>
    );
  };

  return (
    <Fragment>
      <Box bgColor="#92ccd3" w="100vw" h="100vh" p={4}>
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
            onView={handleChangeView}
            onSelectEvent={handleSelectSlot}
            onSelectSlot={handleSelectSlot}
            onSelecting={() => false}
            onNavigate={(date) => setCalendarDate(moment(date))}
            components={{
              toolbar: Toolbar,
              dateCellWrapper: (props) =>
                ColoredDateCellWrapper({ ...props, blockEvents: blockEvents }),
            }}
            style={{ width: 600, height: viewMode === "month" ? 500 : "auto" }}
            className={css(
              stylesheet.rbc,
              stylesheet.rbcTimeBlockEvent,
              viewMode === "month"
                ? stylesheet.rbcDateEventHide
                : viewMode === "day" &&
                  (calendarDate.isBefore(moment()) ||
                    blockEvents.find(
                      (e) =>
                        e.type === "date" &&
                        moment(e.start).date() === calendarDate.date()
                    )) //not available date
                ? stylesheet.rbcTimeOff
                : stylesheet.rbcTimeOn
            )}
          />
          <ControlPanel />
        </HStack>
      </Box>
    </Fragment>
  );
}

const stylesheet: any = {
  rbc: {
    "& .rbc-off-range-bg": {
      opacity: 0,
      cursor: "not-allowed",
    },
    "& .rbc-date-cell.rbc-off-range": {
      visibility: "hidden",
    },
    "& .rbc-events-container": {
      margin: "0px",
    },
    "& .rbc-today": {
      backgroundColor: "transparent",
    },
    "& .chakra-icon": {
      cursor: "pointer",
    },
  },
  rbcDateEventHide: {
    "& .rbc-event": {
      display: "none",
    },
  },
  rbcTimeBlockEvent: {
    "& .rbc-event": {
      backgroundColor: offColor,
      border: "0px !important",
      borderRadius: "0px",
    },
    "& .rbc-event-label": {
      display: "none",
    },
  },
  rbcTimeOn: {
    "& .rbc-day-slot .rbc-timeslot-group": {
      backgroundColor: onColor,
    },
  },
  rbcTimeOff: {
    "& .rbc-day-slot .rbc-timeslot-group": {
      backgroundColor: offColor,
    },
  },
};
