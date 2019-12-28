#!/usr/bin/env perl

use strict;
use warnings;

use IPC::System::Simple qw(capture);

sub runintcode {
    my $input = shift // die "no input file";

    my $rawout = capture("node 2a.js < '$input'");

    $rawout =~ /^([^,]+),/;
    my $out = $1;

    return $out;
}

sub mutate_input {
    my $input = shift // die "No input";
    my $outpath = shift // die "No output file";
    my $noun = shift // die "no noun";
    my $verb = shift // die "no verb";

    $input =~ s/^([^,]+),[^,]+,[^,]+,/$1,$noun,$verb,/;

    open(my $fh, ">", $outpath) // die "Can't open $outpath";

    print $fh $input;

    close $fh;
}

sub read_input {
  my $path = shift // die "no path";

  open(my $fh, "<", $path) // die "Can't read input file";

  my $content;
  while (my $line = <$fh>) {
    $content .= $line;
  }

  close($fh);

  return $content;
}

my $content = read_input("2_input");

my $target = 19690720;
my $scratch = "2_scratch";

my ($res, $noun, $verb);
for ($noun = 0; $res != $target; $noun++) {
  die "Did not find a solution!" if $noun > 99;
  for ($verb = 0; $res != $target && $verb <= 99; $verb++) {
    mutate_input($content, $scratch, $noun, $verb);
    $res = runintcode($scratch);
  }
}

$noun--;
$verb--;

print "$res: n: $noun, v: $verb\n";
print 100 * $noun + $verb . "\n";
