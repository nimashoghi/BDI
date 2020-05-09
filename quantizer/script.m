pkg load signal
A = load('/data/data.txt')
B = uencode(A, str2num(getenv('NUM_BITS')))
save('/data/data.txt', 'B')
