#include <stdbool.h>
#include <stdio.h>

// Macro to get string literal of an expanded macro s
#define xstr(s) str(s)
#define str(s) #s

#define PASS_LEN 6
#define PASS_BUFF_LEN PASS_LEN + 1
#define PASS_FORMAT "%." xstr(PASS_LEN) "d"

const unsigned int INPUT_MIN = 357253;
const unsigned int INPUT_MAX = 892942;

bool check_limit(char *pass, char *pass_limit);
bool check_digits(char *pass);
bool inc_password(char *pass, char *pass_limit);

int main() {
  unsigned int checked = 0;
  unsigned int possibilities = 0;
  char password[PASS_BUFF_LEN];
  char password_limit[PASS_BUFF_LEN];

  snprintf(password,       PASS_BUFF_LEN, "%.d", INPUT_MIN);
  snprintf(password_limit, PASS_BUFF_LEN, "%d",  INPUT_MAX + 1);

  do {
    checked++;
    if (check_digits(password)) {
      possibilities++;
    }
  } while (inc_password(password, password_limit));

  printf("Matches: %d/%d\n", possibilities, checked);
}

// Increments the password string
// Returns false if we have reached the end of iteration
bool inc_password(char *pass, char *pass_limit) {
  for (int i = PASS_LEN - 1; i >= 0; i--) {
    char new_c = ++pass[i];

    if (new_c <= '9') {
      break;
    }

    pass[i] = '0';
  }

  return !check_limit(pass, pass_limit);
}

bool check_limit(char *pass, char *pass_limit) {
  bool all_over = true;
  for (int i = 0; i < PASS_LEN; i++) {
    all_over = all_over && pass[i] >= pass_limit[i];
  }
  return all_over;
}

// Checks the digit conditions on the password string
// Does not check the range.
bool check_digits(char *pass) {
  bool seen_double = false;
  int group_counter = 0;
  char prev = '0' - 1;

  for (int i = 0; i < PASS_LEN; i++) {
    char curr = pass[i];
    if (curr < prev) {
      return false;
    }

    if (curr == prev) {
      group_counter++;
    } else {
      // Once we've seen the end of a group, mark if it was a double then reset
      if (group_counter == 1) {
        seen_double = true;
      }
      group_counter = 0;
    }
    prev = curr;
  }

  // Need to check if the last group was a double
  return seen_double || group_counter == 1;
}
