FROM mtmiller/octave

RUN octave --eval "pkg install -forge control"
RUN octave --eval "pkg install -forge signal"

WORKDIR /app
COPY ./script.m ./script.m

ENV NUM_BITS=16
CMD octave script.m
