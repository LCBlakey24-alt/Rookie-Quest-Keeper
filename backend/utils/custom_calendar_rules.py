"""Validation and date arithmetic for custom campaign calendars.

All methods are pure so the API and offline/personalized paths use identical
month boundaries without assuming Gregorian seven-day weeks.
"""
from fastapi import HTTPException


def valid_months(months):
    if not isinstance(months, list) or not 1 <= len(months) <= 24:
        return False
    return all(
        isinstance(month, dict) and str(month.get("name") or "").strip()
        and type(month.get("days")) is int and 1 <= month["days"] <= 100
        for month in months
    )


def check_calendar(calendar):
    months = calendar.get("custom_months") or []
    if not valid_months(months):
        raise HTTPException(status_code=422, detail="Calendar needs 1–24 named months, each 1–100 days.")
    week = calendar.get("days_per_week", 7)
    if type(week) is not int or not 1 <= week <= 10:
        raise HTTPException(status_code=422, detail="A custom week must have between 1 and 10 days.")
    validate_day(calendar, calendar.get("current_year"), calendar.get("current_month"), calendar.get("current_day"))


def validate_day(calendar, year, month, day):
    months = calendar.get("custom_months") or []
    if (type(year) is not int or type(month) is not int or type(day) is not int
            or month < 1 or month > len(months)
            or day < 1 or day > months[month - 1]["days"]):
        raise HTTPException(status_code=422, detail="Day, month or year is invalid for this campaign calendar.")


def advance_calendar_date(calendar, days):
    check_calendar(calendar)
    if type(days) is not int or not 1 <= days <= 10000:
        raise HTTPException(status_code=422, detail="Advance time by 1–10,000 whole days.")
    months = [month["days"] for month in calendar["custom_months"]]
    year_days = sum(months)
    index = (calendar["current_year"] * year_days
             + sum(months[:calendar["current_month"] - 1])
             + calendar["current_day"] - 1 + days)
    year, remaining = divmod(index, year_days)
    month = 1
    while remaining >= months[month - 1]:
        remaining -= months[month - 1]
        month += 1
    return {"current_year": year, "current_month": month, "current_day": remaining + 1}
